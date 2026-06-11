import { LRUCache } from '@hermes-panel/shared';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  etag?: string;
}

export const apiCache = new LRUCache<string, CacheEntry>({
  maxSize: 200,
  maxAge: 300000,
});

export async function cachedFetch<T>(
  url: string,
  opts?: RequestInit & { cacheTtl?: number },
): Promise<T> {
  const cached = apiCache.get(url);
  if (cached) {
    return cached.data as T;
  }

  const headers = new Headers(opts?.headers);
  if (cached?.etag) {
    headers.set('If-None-Match', cached.etag);
  }

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 304 && cached) {
    return cached.data as T;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data: unknown = await res.json();
  const etag = res.headers.get('etag') ?? undefined;

  apiCache.set(url, { data, timestamp: Date.now(), etag }, opts?.cacheTtl);

  return data as T;
}
