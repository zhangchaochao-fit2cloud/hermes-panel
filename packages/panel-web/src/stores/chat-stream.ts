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
  const currentRunId = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  let handle: SSEHandle | null = null;

  async function send(input: string, model: string): Promise<void> {
    const session = useSessionStore();
    const system = useSystemStore();

    session.appendUserMessage(input);

    state.value = 'creating';
    lastError.value = null;
    reconnectAttempts.value = 0;

    try {
      const run = await startRun(system.hermesApiKey ?? '', {
        model,
        input,
        stream: true,
        session_id: session.sessionId ?? undefined,
      });
      currentRunId.value = run.runId;
      state.value = 'streaming';

      handle = consumeSSE(run.runId, system.hermesApiKey ?? '', {
        onEvent: (ev: SSEEvent) => dispatch(ev),
        onError: (err) => {
          lastError.value = `SSE error: ${(err as Event).type ?? 'unknown'}`;
          state.value = 'error';
        },
        onClose: () => {
          handle = null;
          if (state.value === 'streaming') state.value = 'done';
        },
      });
    } catch (err) {
      lastError.value = (err as Error).message;
      state.value = 'error';
    }
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
        state.value = 'error';
        break;
    }
  }

  function abort(): void {
    handle?.close();
    handle = null;
    state.value = 'idle';
  }

  return { state, lastError, currentRunId, reconnectAttempts, send, abort };
});
