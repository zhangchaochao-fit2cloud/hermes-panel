import { HEADERS } from '@hermes-panel/shared';
import { computed, ref } from 'vue';
import { useHermesEndpointStore } from '@/stores/hermes-endpoint';
import { getBffBase, getPanelToken } from './token.js';

interface BffError { code: string; message: string }
export interface BffFetchOptions extends RequestInit { silent?: boolean }

const pendingRequestCount = ref(0);
export const globalRequestLoading = computed(() => pendingRequestCount.value > 0);

export class BffApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'BffApiError';
  }
}

export async function bffFetch<T>(path: string, init: BffFetchOptions = {}): Promise<T> {
  const { silent = false, ...requestInit } = init;
  const url = `${getBffBase()}${path}`;
  const headers = new Headers(requestInit.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(HEADERS.PANEL_TOKEN, getPanelToken());

  // Forward the active Hermes endpoint when calling proxied hermes routes.
  if (path.startsWith('/api/hermes')) {
    try {
      const ep = useHermesEndpointStore();
      if (ep.active?.baseUrl) headers.set(HEADERS.HERMES_ENDPOINT, ep.active.baseUrl);
    } catch {
      // store not initialised — fall back to BFF default
    }
  }

  if (!silent) pendingRequestCount.value += 1;
  let res: Response;
  try {
    res = await fetch(url, { ...requestInit, headers });
  } catch (err) {
    // WebKit returns the unhelpful "Load failed" — annotate with context
    const msg = (err as Error).message ?? String(err);
    const enhanced = new BffApiError(
      'BFF_UNREACHABLE',
      `BFF unreachable at ${url}: ${msg}`,
      0
    );
    console.error('[bff]', enhanced);
    throw enhanced;
  } finally {
    if (!silent) pendingRequestCount.value = Math.max(0, pendingRequestCount.value - 1);
  }

  if (!res.ok) {
    let err: BffError = { code: 'HTTP_ERROR', message: res.statusText };
    try { err = (await res.json()).error ?? err; } catch { /* ignore */ }
    throw new BffApiError(err.code, err.message, res.status);
  }
  return (await res.json()) as T;
}
