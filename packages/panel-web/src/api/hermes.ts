import type { SSEEvent } from '@hermes-panel/shared';
import { getHermesApiBase } from './token.js';

interface RunStartPayload {
  model: string;
  input: string;
  stream: true;
  session_id?: string;
}

export interface RunHandle {
  runId: string;
}

export async function startRun(
  apiKey: string,
  payload: RunStartPayload
): Promise<RunHandle> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${getHermesApiBase()}/v1/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`startRun failed: HTTP ${res.status}`);
  const data = (await res.json()) as { run_id: string };
  return { runId: data.run_id };
}

export interface SSEHandle {
  close: () => void;
}

export function consumeSSE(
  runId: string,
  apiKey: string,
  handlers: {
    onEvent: (ev: SSEEvent) => void;
    onError: (err: Event) => void;
    onClose: () => void;
  }
): SSEHandle {
  // EventSource doesn't support custom headers, so the api key is
  // tracked for a future fetch+ReadableStream implementation.
  void apiKey;
  const url = new URL(`${getHermesApiBase()}/v1/runs/${runId}/events`);
  const es = new EventSource(url.toString());

  const eventTypes: SSEEvent['type'][] = [
    'message.start', 'message.delta', 'message.reasoning',
    'tool.call.start', 'tool.call.result', 'tool.call.error',
    'message.complete', 'run.done', 'run.error',
  ];

  for (const type of eventTypes) {
    es.addEventListener(type, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        handlers.onEvent({ type, ...data } as SSEEvent);
        if (type === 'run.done' || type === 'run.error') {
          es.close();
          handlers.onClose();
        }
      } catch (err) {
        handlers.onError(new ErrorEvent('parse', { error: err }));
      }
    });
  }

  es.onerror = handlers.onError;

  return { close: () => { es.close(); handlers.onClose(); } };
}
