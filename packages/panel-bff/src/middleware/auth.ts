import type { Middleware } from 'koa';
import { HEADERS } from '@hermes-panel/shared';
import { getSessionToken } from '../lib/token.js';
import { resolveSession } from '../services/auth-store.js';

/**
 * Public path prefixes that manage their own auth (login page needs them
 * before the user has a session). Everything else requires either:
 *   - a valid account session token (issued by /api/auth/*), or
 *   - the boot token (local-trust fallback for desktop / same-origin).
 *
 * The boot-token fallback is retained for Phase 1 so the desktop shell and
 * existing tooling keep working. It is dropped once LAN exposure is enabled
 * (Phase 2) — at that point only account sessions are accepted.
 */
const PUBLIC_PREFIXES = ['/api/auth/'];

function isPublic(path: string): boolean {
  if (path === '/api/system/health') return true;
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

export const authMiddleware: Middleware = async (ctx, next) => {
  if (isPublic(ctx.path)) {
    await next();
    return;
  }
  const provided = ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()];
  const token = typeof provided === 'string' ? provided : '';

  // 1) Account session token → authenticated user.
  const user = token ? resolveSession(token) : null;
  if (user) {
    ctx.state.user = user;
    await next();
    return;
  }

  // 2) Boot token → local-trust fallback (no user attached).
  if (token && token === getSessionToken()) {
    await next();
    return;
  }

  ctx.status = 401;
  ctx.body = { error: { code: 'UNAUTHORIZED', message: 'authentication required' } };
};
