import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SSEEvent } from '@hermes-panel/shared';
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
        onEvent: (ev: SSEEvent) => dispatch(ev),
        onError: () => {
          // EventSource error usually triggers when the stream ends naturally,
          // so don't surface unless we never received any events.
          if (state.value === 'streaming') {
            state.value = 'done';
          }
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

  function dispatch(ev: SSEEvent): void {
    const session = useSessionStore();
    switch (ev.type) {
      case 'message.start':
        session.getOrCreateAssistant(ev.messageId);
        break;
      case 'message.delta':
        session.appendDelta(ev.messageId, ev.text);
        break;
      case 'message.reasoning':
        session.appendReasoning(ev.messageId, ev.text);
        break;
      case 'tool.call.start':
        session.startToolCall(ev.messageId, ev.toolCallId, ev.name, ev.input);
        break;
      case 'tool.call.result':
        session.updateToolCall(ev.toolCallId, {
          status: 'done', output: ev.output, completedAt: Date.now(),
        });
        break;
      case 'tool.call.error':
        session.updateToolCall(ev.toolCallId, {
          status: 'error', errorMessage: ev.error, completedAt: Date.now(),
        });
        break;
      case 'message.complete':
        session.completeMessage(ev.messageId, ev.usage);
        break;
      case 'run.done':
        state.value = 'done';
        break;
      case 'run.error':
        lastError.value = ev.error;
        lastErrorCode.value = 'HERMES_RUN_ERROR';
        state.value = 'error';
        break;
    }
  }

  function abort(): void {
    handle?.close();
    handle = null;
    state.value = 'idle';
  }

  return { state, lastError, lastErrorCode, currentRunId, reconnectAttempts, send, abort };
});
