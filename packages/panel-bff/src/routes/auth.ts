/**
 * Account auth endpoints — 1Panel-style local password authentication.
 *
 * Public endpoints (exempted by middleware/auth.ts):
 *   GET  /api/auth/context            → { needsBootstrap }
 *   POST /api/auth/setup              → { token, user }   body: { password }        (first launch only)
 *   POST /api/auth/login              → { token, user }   body: { password, email? }
 *   POST /api/auth/logout             → 204                (X-Panel-Token)
 *   GET  /api/auth/me                 → { user, license, features }  (X-Panel-Token)
 *   POST /api/auth/license/activate   → { license }        body: { key }            (X-Panel-Token)
 *   GET  /api/auth/license/status     → { license, features }                      (X-Panel-Token)
 *   POST /api/auth/license/deactivate → 204                (X-Panel-Token)
 *
 * Admin endpoints (require role=admin via session token):
 *   POST /api/auth/licenses             → { license }  body: { tier?, expiresAt? }
 *   GET  /api/auth/licenses             → { licenses[] }
 *   POST /api/auth/licenses/:key/revoke → 204
 */

import Router from '@koa/router';
import { HEADERS } from '@hermes-panel/shared';
import type { AuthContext, AuthResult, MeResponse } from '@hermes-panel/shared';
import { logger } from '../lib/logger.js';
import {
  verifyCredentials,
  createSession,
  resolveSession,
  revokeSession,
  setupAdmin,
  isBootstrap,
  isLicenseValid,
  getLicense,
  getLicenseForUser,
  getFeaturesForUser,
  activateLicense,
  deactivateLicense,
  createLicense,
  listLicenses,
  revokeLicense,
} from '../services/auth-store.js';

export const authRouter = new Router();

const MIN_PASSWORD = 6;

function bad(ctx: Router.RouterContext, code: string, message: string, status = 400): void {
  ctx.status = status;
  ctx.body = { error: { code, message } };
}

function sessionTokenFromHeader(ctx: Router.RouterContext): string {
  const v = ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()];
  return typeof v === 'string' ? v : '';
}

function deviceLabel(ctx: Router.RouterContext): string {
  const ua = ctx.headers['user-agent'];
  return (typeof ua === 'string' ? ua : '').slice(0, 120);
}

/** Requires an admin session; sends 401 if unauthenticated, 403 if not admin. */
function requireAdmin(ctx: Router.RouterContext): boolean {
  const token = sessionTokenFromHeader(ctx);
  if (!token) {
    bad(ctx, 'UNAUTHORIZED', 'authentication required', 401);
    return false;
  }
  const user = resolveSession(token);
  if (!user) {
    bad(ctx, 'UNAUTHORIZED', 'authentication required', 401);
    return false;
  }
  if (user.role !== 'admin') {
    bad(ctx, 'FORBIDDEN', 'admin required', 403);
    return false;
  }
  ctx.state.user = user;
  return true;
}

// ---------------------------------------------------------------------------
// Public auth endpoints
// ---------------------------------------------------------------------------

authRouter.get('/auth/context', async (ctx) => {
  const body: AuthContext = {
    needsBootstrap: isBootstrap(),
  };
  ctx.body = body;
});

authRouter.post('/auth/setup', async (ctx) => {
  if (!isBootstrap()) {
    return bad(ctx, 'ALREADY_SETUP', 'admin already exists — use login instead', 403);
  }
  const b = (ctx.request.body ?? {}) as { password?: unknown };
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < MIN_PASSWORD) {
    return bad(ctx, 'WEAK_PASSWORD', `password must be at least ${MIN_PASSWORD} characters`);
  }
  const user = setupAdmin(password);
  const token = createSession(user.id, deviceLabel(ctx));
  logger.info({ userId: user.id }, 'admin account created');
  const result: AuthResult = { token, user };
  ctx.status = 201;
  ctx.body = result;
});

authRouter.post('/auth/login', async (ctx) => {
  const b = (ctx.request.body ?? {}) as { password?: unknown; email?: unknown };
  const password = typeof b.password === 'string' ? b.password : '';
  const email = typeof b.email === 'string' ? b.email.trim() : undefined;
  if (!password) return bad(ctx, 'INVALID_BODY', 'password is required');

  const user = verifyCredentials({ password, email });
  if (!user) return bad(ctx, 'INVALID_CREDENTIALS', 'invalid password', 401);

  const token = createSession(user.id, deviceLabel(ctx));
  const result: AuthResult = { token, user };
  ctx.body = result;
});

authRouter.post('/auth/logout', async (ctx) => {
  revokeSession(sessionTokenFromHeader(ctx));
  ctx.status = 204;
});

authRouter.get('/auth/me', async (ctx) => {
  const user = resolveSession(sessionTokenFromHeader(ctx));
  if (!user) return bad(ctx, 'UNAUTHORIZED', 'not authenticated', 401);
  const license = getLicenseForUser(user.id);
  const features = getFeaturesForUser(user.id);
  const body: MeResponse = { user, license, features };
  ctx.body = body;
});


// ---------------------------------------------------------------------------
// Pairing: one-click approve from Panel (runs hermes pairing approve <code>)
// ---------------------------------------------------------------------------

authRouter.post('/auth/pairing/approve', async (ctx) => {
  const token = sessionTokenFromHeader(ctx);
  const user = resolveSession(token);
  if (!user) return bad(ctx, 'UNAUTHORIZED', 'not authenticated', 401);

  const b = (ctx.request.body ?? {}) as { code?: unknown };
  const code = typeof b.code === 'string' ? b.code.trim() : '';
  if (!code) return bad(ctx, 'INVALID_BODY', 'pairing code is required');

  const { execSync } = await import('node:child_process');
  try {
    const output = execSync(`hermes pairing approve ${code}`, {
      encoding: 'utf-8',
      timeout: 10_000,
      env: { ...process.env, HOME: process.env.HOME },
    });
    logger.info({ code }, 'pairing approved');
    ctx.body = { ok: true, output: output.trim() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ code, err: msg }, 'pairing approve failed');
    ctx.status = 500;
    ctx.body = { error: { code: 'PAIRING_FAILED', message: msg } };
  }
});

// ---------------------------------------------------------------------------
// License activation (for current user, requires auth)
// ---------------------------------------------------------------------------

authRouter.post('/auth/license/activate', async (ctx) => {
  const token = sessionTokenFromHeader(ctx);
  const user = resolveSession(token);
  if (!user) return bad(ctx, 'UNAUTHORIZED', 'not authenticated', 401);

  const b = (ctx.request.body ?? {}) as { key?: unknown };
  const key = typeof b.key === 'string' ? b.key.trim().toUpperCase() : '';
  if (!key) return bad(ctx, 'INVALID_BODY', 'license key is required');
  if (!isLicenseValid(key)) return bad(ctx, 'LICENSE_INVALID', 'license key is invalid', 403);

  const lic = getLicense(key)!;
  if (lic.boundUserId && lic.boundUserId !== user.id) {
    return bad(ctx, 'LICENSE_BOUND', 'license is already bound to another account', 403);
  }

  const activated = activateLicense(key, user.id, '', '');
  if (!activated) return bad(ctx, 'LICENSE_INVALID', 'failed to activate license', 500);

  logger.info({ userId: user.id, key }, 'license activated');
  ctx.body = { license: activated };
});

authRouter.get('/auth/license/status', async (ctx) => {
  const user = resolveSession(sessionTokenFromHeader(ctx));
  if (!user) return bad(ctx, 'UNAUTHORIZED', 'not authenticated', 401);
  const license = getLicenseForUser(user.id);
  const features = getFeaturesForUser(user.id);
  ctx.body = { license, features };
});

authRouter.post('/auth/license/deactivate', async (ctx) => {
  const token = sessionTokenFromHeader(ctx);
  const user = resolveSession(token);
  if (!user) return bad(ctx, 'UNAUTHORIZED', 'not authenticated', 401);

  const b = (ctx.request.body ?? {}) as { key?: unknown };
  const key = typeof b.key === 'string' ? b.key.trim().toUpperCase() : '';
  if (!key) return bad(ctx, 'INVALID_BODY', 'license key is required');

  const ok = deactivateLicense(key, user.id);
  if (!ok) return bad(ctx, 'LICENSE_INVALID', 'license not found or not bound to this account', 404);

  ctx.status = 204;
});

// ---------------------------------------------------------------------------
// Admin: license management
// ---------------------------------------------------------------------------

authRouter.post('/auth/licenses', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  const b = (ctx.request.body ?? {}) as { tier?: unknown; expiresAt?: unknown };
  const tier = typeof b.tier === 'string' && (b.tier === 'web' || b.tier === 'desktop' || b.tier === 'pro')
    ? b.tier
    : 'web';
  const expiresAt = typeof b.expiresAt === 'number' ? b.expiresAt : undefined;
  const lic = createLicense({ tier, createdBy: ctx.state.user.id, expiresAt });
  ctx.status = 201;
  ctx.body = { license: lic };
});

authRouter.get('/auth/licenses', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.body = { licenses: listLicenses() };
});

authRouter.post('/auth/licenses/:key/revoke', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  revokeLicense(ctx.params.key);
  ctx.status = 204;
});
