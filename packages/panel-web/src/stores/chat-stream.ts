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
      case 'message.delta':
        session.appendDelta((ev as { delta: string }).delta);
        break;
      case 'reasoning.available':
        session.appendReasoning((ev as { text: string }).text);
        break;
      case 'tool.started': {
        const e = ev as { tool: string; preview?: string };
        session.startToolCall(e.tool, e.preview);
        break;
      }
      case 'tool.completed': {
        const e = ev as { tool: string; duration?: number; error?: boolean };
        session.completeToolCall(e.tool, { error: e.error, durationSec: e.duration });
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

  function abort(): void {
    handle?.close();
    handle = null;
    state.value = 'idle';
  }

  return { state, lastError, lastErrorCode, currentRunId, reconnectAttempts, send, abort };
});
