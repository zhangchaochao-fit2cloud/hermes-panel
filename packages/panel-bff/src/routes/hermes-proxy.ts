import Router from '@koa/router';
import { PassThrough } from 'node:stream';
import { logger } from '../lib/logger.js';
import { HEADERS, PORTS } from '@hermes-panel/shared';
import { getHermesApiKey } from '../services/hermes-api-key.js';

/**
 * Proxy /api/hermes/* to the configured hermes API server.
 *
 * Why proxy instead of letting the frontend talk to hermes directly:
 *  1. Single CORS origin (only the BFF needs to be whitelisted).
 *  2. Hide the hermes API key in BFF env, never sent to the browser.
 *  3. Tauri WebView's WebKit fetch sometimes fails to upgrade to SSE
 *     across a separate origin — proxying through BFF avoids it.
 */
export const hermesProxyRouter = new Router();

function getDefaultHermesBase(): string {
  return process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`;
}

/**
 * Resolve the upstream base URL for this request.
 *
 * Precedence:
 *   1. X-Hermes-Endpoint header (set by the frontend per active endpoint).
 *   2. process.env.HERMES_API_BASE.
 *   3. http://127.0.0.1:{HERMES_API}.
 *
 * Allowlist (defense in depth): only http://127.0.0.1:*, http://localhost:*,
 * or any https:// URL is accepted. Anything else (file:, javascript:, plain
 * http on a non-loopback host) falls through to the default. The BFF is
 * single-user and already gated by X-Panel-Token, so we trust the panel
 * itself to pick the right endpoint; this allowlist exists so that a leaked
 * token + crafted header can't trick the BFF into hitting an arbitrary
 * internal HTTP host.
 */
function resolveUpstreamBase(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return getDefaultHermesBase();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return getDefaultHermesBase();
  }
  if (url.protocol === 'https:') return raw.replace(/\/+$/, '');
  if (url.protocol === 'http:') {
    const host = url.hostname;
    if (host === '127.0.0.1' || host === 'localhost' || host === '::1') {
      return raw.replace(/\/+$/, '');
    }
  }
  return getDefaultHermesBase();
}

hermesProxyRouter.all('/hermes/(.*)', async ctx => {
  // koa-router exposes the wildcard capture as ctx.params[0]
  const rawPath = ctx.path;  // includes /api prefix? no — the proxy router is mounted under /api
  // Strip the leading '/hermes/' (or '/api/hermes/' if router prefix nests)
  const subpath = rawPath.replace(/^\/api\/hermes\/?/, '').replace(/^\/hermes\/?/, '');
  const base = resolveUpstreamBase(ctx.headers[HEADERS.HERMES_ENDPOINT.toLowerCase()]);
  const upstream = `${base}/${subpath}${ctx.querystring ? '?' + ctx.querystring : ''}`;

  // Build forwarded headers
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx.headers)) {
    if (typeof v !== 'string') continue;
    const lower = k.toLowerCase();
    // Strip hop-by-hop and origin-sensitive headers
    if (['host', 'origin', 'connection', 'content-length', 'cookie',
         'x-panel-token', 'x-hermes-endpoint', 'referer'].includes(lower)) continue;
    headers[k] = v;
  }
  const key = await getHermesApiKey();
  if (key) headers['authorization'] = `Bearer ${key}`;

  // Body for POST/PUT/PATCH
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
    body = JSON.stringify(ctx.request.body ?? {});
    headers['content-type'] = 'application/json';
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      method: ctx.method,
      headers,
      body,
    });
  } catch (err) {
    logger.warn({ err, upstream }, 'hermes upstream fetch failed');
    ctx.status = 502;
    ctx.body = { error: { code: 'HERMES_UNREACHABLE', message: `cannot reach ${upstream}` } };
    return;
  }

  ctx.status = upstreamRes.status;
  // Forward response headers (filter hop-by-hop)
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lower)) return;
    ctx.set(key, value);
  });

  // Stream the response body. This is essential for SSE — we must pipe
  // chunk-by-chunk so message.delta arrives at the client immediately.
  if (!upstreamRes.body) {
    ctx.body = '';
    return;
  }

  const pass = new PassThrough();
  ctx.body = pass;

  const reader = upstreamRes.body.getReader();
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pass.write(Buffer.from(value));
      }
    } catch (err) {
      logger.warn({ err }, 'hermes proxy stream error');
    } finally {
      pass.end();
    }
  })();
});
