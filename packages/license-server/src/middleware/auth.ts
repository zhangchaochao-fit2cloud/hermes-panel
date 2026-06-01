import type Router from '@koa/router';
import { verifyApiKey, resolveSession } from '../services/auth.js';

function bad(ctx: Router.RouterContext, code: string, message: string, status = 400): void {
  ctx.status = status;
  ctx.body = { error: { code, message } };
}

export function requireUser(ctx: Router.RouterContext): boolean {
  const token = (ctx.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    bad(ctx, 'UNAUTHORIZED', 'authentication required', 401);
    return false;
  }
  const user = resolveSession(token);
  if (!user) {
    bad(ctx, 'UNAUTHORIZED', 'invalid or expired token', 401);
    return false;
  }
  ctx.state.user = user;
  return true;
}

export function requireAdmin(ctx: Router.RouterContext): boolean {
  if (!requireUser(ctx)) return false;
  if (ctx.state.user.role !== 'admin') {
    bad(ctx, 'FORBIDDEN', 'admin required', 403);
    return false;
  }
  return true;
}

/** API key auth for Panel BFF calling activate/deactivate/verify. */
export function requireApiKey(ctx: Router.RouterContext): boolean {
  const apiKey = (ctx.headers['x-license-api-key'] ?? '') as string;
  if (!apiKey || !verifyApiKey(apiKey)) {
    bad(ctx, 'UNAUTHORIZED', 'invalid API key', 401);
    return false;
  }
  return true;
}
