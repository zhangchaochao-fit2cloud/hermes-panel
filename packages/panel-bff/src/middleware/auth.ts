import type { Middleware } from 'koa';
import { HEADERS } from '@hermes-panel/shared';
import { getSessionToken } from '../lib/token.js';

export const authMiddleware: Middleware = async (ctx, next) => {
  // Allow health check without auth so Tauri can probe
  if (ctx.path === '/api/system/health') {
    await next();
    return;
  }
  const provided = ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()];
  if (provided !== getSessionToken()) {
    ctx.status = 401;
    ctx.body = { error: { code: 'UNAUTHORIZED', message: 'invalid panel token' } };
    return;
  }
  await next();
};
