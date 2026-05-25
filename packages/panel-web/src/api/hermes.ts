import type { HermesSSEEvent } from '@hermes-panel/shared';
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
  payload: RunStartPayload,
  baseUrl?: string,
): Promise<RunHandle> {
  const base = baseUrl ?? getHermesApiBase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${base}/v1/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`startRun failed: HTTP ${res.status} ${res.statusText}${text ? ' · ' + text.slice(0, 200) : ''}`);
  }
  const data = (await res.json()) as { run_id: string };
  return { runId: data.run_id };
}

export interface SSEHandle {
  close: () => void;
}

/**
 * Consume the Hermes SSE event stream for a given run.
 *
 * Hermes sends events as:
 *   data: {"event": "message.delta", "run_id": "...", "delta": "..."}\n\n
 *
 * We use fetch + ReadableStream instead of EventSource because:
 *  1. EventSource can't set Authorization headers.
 *  2. Hermes doesn't use SSE `event:` headers — payload contains event name.
 */
export function consumeSSE(
  runId: string,
  apiKey: string,
  handlers: {
    onEvent: (ev: HermesSSEEvent) => void;
    onError: (msg: string) => void;
    onClose: () => void;
  },
  baseUrl?: string,
): SSEHandle {
  const base = baseUrl ?? getHermesApiBase();
  const controller = new AbortController();
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    controller.abort();
    handlers.onClose();
  };

  void (async () => {
    try {
      const headers: Record<string, string> = { 'Accept': 'text/event-stream' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${base}/v1/runs/${runId}/events`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        handlers.onError(`SSE stream failed: HTTP ${res.status}`);
        close();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split into SSE messages on blank line (\n\n).
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = raw.split('\n').find(line => line.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as HermesSSEEvent;
            handlers.onEvent(ev);
            if (ev.event === 'run.completed' || ev.event === 'run.error') {
              close();
              return;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
      close();
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      handlers.onError((err as Error).message ?? 'unknown SSE error');
      close();
    }
  })();

  return { close };
}
