import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HermesSSEEvent } from '@hermes-panel/shared';
import { startRun, consumeSSE, type SSEHandle } from '@/api/hermes';
import { useSessionStore } from './session';
import { useUsageStore } from './usage';

export type StreamState = 'idle' | 'creating' | 'streaming' | 'done' | 'error' | 'reconnecting';

export const useChatStreamStore = defineStore('chat-stream', () => {
  const state = ref<StreamState>('idle');
  const lastError = ref<string | null>(null);
  const lastErrorCode = ref<string | null>(null);
  const currentRunId = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  // 流式 throughput 估算：用滚动窗口（最近 3s）算 char/s。
  // 字符≈token 的 0.25-0.5 倍（中英文混合），UI 上以"约 N tok/s"显示。
  const streamStartedAt = ref<number>(0);
  const streamCharCount = ref<number>(0);
  const charsPerSec = ref<number>(0);
  // ring buffer 替代 push/shift — 流式 100+ delta/s 时 shift 是 O(n)。
  // 64 个样本 × 200ms 采样间隔 ≈ 12.8s 窗口，UI 实际只需 3s 即可显示稳定值。
  const SAMPLE_CAP = 64;
  const SAMPLE_MIN_INTERVAL_MS = 200;
  const sampleTimes = new Float64Array(SAMPLE_CAP);
  const sampleChars = new Int32Array(SAMPLE_CAP);
  let sampleHead = 0;       // 下一个写入位置
  let sampleSize = 0;       // 当前样本数
  let lastSampleTime = 0;

  function bumpCharCount(addedChars: number): void {
    streamCharCount.value += addedChars;
    const now = Date.now();
    // 采样节流：< 200ms 内忽略，避免每 delta 都写
    if (now - lastSampleTime < SAMPLE_MIN_INTERVAL_MS) return;
    lastSampleTime = now;
    sampleTimes[sampleHead] = now;
    sampleChars[sampleHead] = streamCharCount.value;
    sampleHead = (sampleHead + 1) % SAMPLE_CAP;
    if (sampleSize < SAMPLE_CAP) sampleSize++;
    if (sampleSize >= 2) {
      const oldestIdx = (sampleHead - sampleSize + SAMPLE_CAP) % SAMPLE_CAP;
      const newestIdx = (sampleHead - 1 + SAMPLE_CAP) % SAMPLE_CAP;
      const dt = (sampleTimes[newestIdx] - sampleTimes[oldestIdx]) / 1000;
      if (dt > 0.1) {
        charsPerSec.value = Math.round((sampleChars[newestIdx] - sampleChars[oldestIdx]) / dt);
      }
    }
  }

  function resetStreamMetrics(): void {
    streamStartedAt.value = Date.now();
    streamCharCount.value = 0;
    charsPerSec.value = 0;
    sampleHead = 0;
    sampleSize = 0;
    lastSampleTime = 0;
  }

  let handle: SSEHandle | null = null;

  // Keep the last `send()` model around so run.completed can attribute
  // the usage entry to the right model without threading state through dispatch().
  const lastModel = ref<string>('');

  async function send(input: string, model: string): Promise<void> {
    const session = useSessionStore();

    lastModel.value = model;
    session.appendUserMessage(input);
    session.startAssistantMessage();

    state.value = 'creating';
    lastError.value = null;
    lastErrorCode.value = null;
    reconnectAttempts.value = 0;
    resetStreamMetrics();

    try {
      const run = await startRun('', {
        model,
        input,
        stream: true,
        session_id: session.sessionId ?? undefined,
      });
      currentRunId.value = run.runId;
      state.value = 'streaming';

      handle = consumeSSE(run.runId, '', {
        onEvent: (ev: HermesSSEEvent) => dispatch(ev),
        onError: (msg) => {
          lastError.value = msg;
          lastErrorCode.value = inferErrorCode(msg);
          state.value = 'error';
        },
        onClose: () => {
          handle = null;
          if (state.value === 'streaming') state.value = 'done';
        },
      });
    } catch (err) {
      const msg = (err as Error).message ?? 'unknown';
      lastError.value = msg;
      lastErrorCode.value = inferErrorCode(msg);
      state.value = 'error';
    }
  }

  function inferErrorCode(msg: string): string {
    if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)) return 'HERMES_API_UNREACHABLE';
    if (/HTTP 401|HTTP 403/.test(msg)) return 'HERMES_API_UNAUTHORIZED';
    if (/HTTP 5\d\d/.test(msg)) return 'HERMES_API_SERVER_ERROR';
    if (/HTTP 4\d\d/.test(msg)) return 'HERMES_API_BAD_REQUEST';
    return 'UNKNOWN';
  }

  function dispatch(ev: HermesSSEEvent): void {
    const session = useSessionStore();
    switch (ev.event) {
      case 'message.delta': {
        const d = (ev as { delta: string }).delta;
        session.appendDelta(d);
        bumpCharCount(d.length);
        break;
      }
      case 'reasoning.available':
        session.appendReasoning((ev as { text: string }).text);
        break;
      case 'tool.started': {
        const e = ev as { tool: string; preview?: string; input?: unknown; args?: unknown; arguments?: unknown };
        session.startToolCall(e.tool, e.preview, extractToolInput(e));
        break;
      }
      case 'tool.completed': {
        const e = ev as { tool: string; duration?: number; error?: boolean; output?: unknown; result?: unknown; message?: string; errorMessage?: string };
        session.completeToolCall(e.tool, {
          error: e.error,
          durationSec: e.duration,
          output: e.output ?? e.result,
          errorMessage: e.errorMessage ?? e.message,
          input: extractToolInput(e, ['duration', 'error', 'output', 'result', 'message', 'errorMessage']),
        });
        break;
      }
      case 'run.completed': {
        const e = ev as { output?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
        session.completeRun(e.output, e.usage ? {
          input: e.usage.input_tokens,
          output: e.usage.output_tokens,
          total: e.usage.total_tokens,
        } : undefined);
        // Persist this run to the usage ledger. Fire-and-forget — the store
        // swallows errors and we never want to fail the stream over telemetry.
        if (e.usage && lastModel.value) {
          const input = e.usage.input_tokens ?? 0;
          const output = e.usage.output_tokens ?? 0;
          const total = e.usage.total_tokens ?? input + output;
          if (total > 0) {
            void useUsageStore().record({
              model: lastModel.value,
              sessionId: session.sessionId ?? undefined,
              input, output, total,
            });
          }
        }
        state.value = 'done';
        break;
      }
      case 'run.error':
        lastError.value = (ev as { error: string }).error;
        lastErrorCode.value = 'HERMES_RUN_ERROR';
        state.value = 'error';
        break;
      // Unknown events are skipped silently (forward-compat)
    }
  }

  function extractToolInput(ev: { [key: string]: unknown; input?: unknown; args?: unknown; arguments?: unknown }, extraOmit: string[] = []): Record<string, unknown> {
    const explicit = toRecord(ev.input) ?? toRecord(ev.args) ?? toRecord(ev.arguments);
    const rest: Record<string, unknown> = {};
    const omitted = new Set(['event', 'run_id', 'timestamp', 'tool', 'preview', 'input', 'args', 'arguments', ...extraOmit]);
    for (const [key, value] of Object.entries(ev)) {
      if (omitted.has(key)) continue;
      rest[key] = value;
    }
    return { ...(explicit ?? {}), ...rest };
  }

  function toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  function abort(): void {
    handle?.close();
    handle = null;
    state.value = 'idle';
  }

  return { state, lastError, lastErrorCode, currentRunId, reconnectAttempts, charsPerSec, send, abort };
});
