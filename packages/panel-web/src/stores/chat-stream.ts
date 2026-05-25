import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HermesSSEEvent } from '@hermes-panel/shared';
import { startRun, consumeSSE, type SSEHandle } from '@/api/hermes';
import { useSessionStore } from './session';
import { useSystemStore } from './system';

export type StreamState = 'idle' | 'creating' | 'streaming' | 'done' | 'error' | 'reconnecting';

export const useChatStreamStore = defineStore('chat-stream', () => {
  const state = ref<StreamState>('idle');
  const lastError = ref<string | null>(null);
  const lastErrorCode = ref<string | null>(null);
  const currentRunId = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  let handle: SSEHandle | null = null;

  async function send(input: string, model: string): Promise<void> {
    const session = useSessionStore();
    const system = useSystemStore();

    session.appendUserMessage(input);
    session.startAssistantMessage();

    state.value = 'creating';
    lastError.value = null;
    lastErrorCode.value = null;
    reconnectAttempts.value = 0;

    const apiBase = system.hermesApiBase || 'http://127.0.0.1:8642';
    const apiKey = system.hermesApiKey ?? '';

    try {
      const run = await startRun(apiKey, {
        model,
        input,
        stream: true,
        session_id: session.sessionId ?? undefined,
      }, apiBase);
      currentRunId.value = run.runId;
      state.value = 'streaming';

      handle = consumeSSE(run.runId, apiKey, {
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
      }, apiBase);
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
