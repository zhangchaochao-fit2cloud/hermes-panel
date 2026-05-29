import type { HermesSSEEvent } from '@hermes-panel/shared';
import { HEADERS } from '@hermes-panel/shared';
import { useHermesEndpointStore } from '@/stores/hermes-endpoint';
import { getBffBaseAsync, getPanelTokenAsync } from './token.js';

interface RunStartPayload {
  model: string;
  input: string;
  stream: true;
  session_id?: string;
}

export interface RunHandle {
  runId: string;
}

/**
 * Calls go through the BFF's /api/hermes/* proxy. This avoids:
 *   - Tauri WebKit's "Load failed" on cross-origin POST to hermes
 *   - Exposing the hermes API key to the browser
 *   - Two CORS whitelists (just the BFF now)
 */

async function bffUrl(path: string): Promise<string> {
  return `${await getBffBaseAsync()}/api/hermes${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    [HEADERS.PANEL_TOKEN]: await getPanelTokenAsync(),
  };
  // Read the active endpoint lazily so changes to the active URL apply
  // to the next request without needing to rebuild any client.
  try {
    const ep = useHermesEndpointStore();
    if (ep.active?.baseUrl) h[HEADERS.HERMES_ENDPOINT] = ep.active.baseUrl;
  } catch {
    // Store not initialised (e.g. SSR/tests) — fall back to BFF default.
  }
  return h;
}

export async function startRun(
  _apiKey: string,
  payload: RunStartPayload,
): Promise<RunHandle> {
  void _apiKey;  // BFF holds the real key; this param is kept for signature symmetry
  const url = await bffUrl('/v1/runs');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error('[hermes] startRun network error', { url, msg, err });
    throw new Error(`Hermes unreachable at ${url}: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`startRun HTTP ${res.status} ${res.statusText}${text ? ' · ' + text.slice(0, 200) : ''}`);
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
  _apiKey: string,
  handlers: {
    onEvent: (ev: HermesSSEEvent) => void;
    onError: (msg: string) => void;
    onClose: () => void;
  },
): SSEHandle {
  void _apiKey;
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
      const url = await bffUrl(`/v1/runs/${runId}/events`);
      const sseHeaders: Record<string, string> = {
        'Accept': 'text/event-stream',
        [HEADERS.PANEL_TOKEN]: await getPanelTokenAsync(),
      };
      try {
        const ep = useHermesEndpointStore();
        if (ep.active?.baseUrl) sseHeaders[HEADERS.HERMES_ENDPOINT] = ep.active.baseUrl;
      } catch {
        // ignore — fall back to BFF default
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: sseHeaders,
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
