import Router from '@koa/router';
import { activateLicense, verifyLicense, deactivateLicense, signedResponse } from '../services/licenses.js';
import { requireApiKey } from '../middleware/auth.js';

export const activateRouter = new Router();

/** Panel: activate a license on a device. Requires API key. */
activateRouter.post('/activate', async (ctx) => {
  if (!requireApiKey(ctx)) return;
  const b = (ctx.request.body ?? {}) as { license?: string; fingerprint?: string; os?: string };
  const license = typeof b.license === 'string' ? b.license.trim() : '';
  const fingerprint = typeof b.fingerprint === 'string' ? b.fingerprint : '';
  const os = typeof b.os === 'string' ? b.os : '';
  if (!license || !fingerprint) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_BODY', message: 'license and fingerprint required' } };
    return;
  }
  const result = activateLicense(license, fingerprint, os);
  const response = signedResponse({
    approved: result.success,
    status: result.success ? 'active' : (result.reason ?? 'invalid'),
    tier: result.tier ?? '',
    features: result.features ?? [],
    expiresAt: null,
    serverTimestamp: Date.now(),
  });
  ctx.body = response;
});

/** Panel: deactivate a license (unbind device). Requires API key. */
activateRouter.post('/deactivate', async (ctx) => {
  if (!requireApiKey(ctx)) return;
  const b = (ctx.request.body ?? {}) as { license?: string; fingerprint?: string };
  const license = typeof b.license === 'string' ? b.license.trim() : '';
  const fingerprint = typeof b.fingerprint === 'string' ? b.fingerprint : '';
  const ok = deactivateLicense(license, fingerprint);
  const response = signedResponse({
    approved: ok,
    serverTimestamp: Date.now(),
  });
  ctx.body = response;
});

/** Panel: periodic verification (every 7 days). Requires API key. */
activateRouter.post('/verify', async (ctx) => {
  if (!requireApiKey(ctx)) return;
  const b = (ctx.request.body ?? {}) as { license?: string; fingerprint?: string };
  const license = typeof b.license === 'string' ? b.license.trim() : '';
  const fingerprint = typeof b.fingerprint === 'string' ? b.fingerprint : '';
  if (!license || !fingerprint) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_BODY', message: 'license and fingerprint required' } };
    return;
  }
  const result = verifyLicense(license, fingerprint);
  const response = signedResponse({
    approved: result.success,
    status: result.success ? 'active' : (result.reason ?? 'invalid'),
    tier: result.tier ?? '',
    features: result.features ?? [],
    expiresAt: null,
    serverTimestamp: Date.now(),
  });
  ctx.body = response;
});
