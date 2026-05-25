import Router from '@koa/router';
import { PassThrough } from 'node:stream';
import { logger } from '../lib/logger.js';
import { PORTS } from '@hermes-panel/shared';

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

function getHermesBase(): string {
  return process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`;
}

function getHermesKey(): string | null {
  return process.env.HERMES_API_KEY ?? null;
}

hermesProxyRouter.all('/hermes/(.*)', async ctx => {
  // koa-router exposes the wildcard capture as ctx.params[0]
  const rawPath = ctx.path;  // includes /api prefix? no — the proxy router is mounted under /api
  // Strip the leading '/hermes/' (or '/api/hermes/' if router prefix nests)
  const subpath = rawPath.replace(/^\/api\/hermes\/?/, '').replace(/^\/hermes\/?/, '');
  const upstream = `${getHermesBase()}/${subpath}${ctx.querystring ? '?' + ctx.querystring : ''}`;

  // Build forwarded headers
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx.headers)) {
    if (typeof v !== 'string') continue;
    const lower = k.toLowerCase();
    // Strip hop-by-hop and origin-sensitive headers
    if (['host', 'origin', 'connection', 'content-length', 'cookie',
         'x-panel-token', 'referer'].includes(lower)) continue;
    headers[k] = v;
  }
  const key = getHermesKey();
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
