import Router from '@koa/router';
import { issueLicense, listLicenses, listAllLicenses, getLicenseByKey, deactivateLicense } from '../services/licenses.js';
import { requireUser, requireAdmin } from '../middleware/auth.js';

export const licensesRouter = new Router();

/** User lists their licenses. */
licensesRouter.get('/licenses', async (ctx) => {
  if (!requireUser(ctx)) return;
  ctx.body = { licenses: listLicenses(ctx.state.user.id) };
});

/** User downloads a license file (the signed .key file). */
licensesRouter.get('/licenses/:id/download', async (ctx) => {
  if (!requireUser(ctx)) return;
  const lic = getLicenseByKey(ctx.params.id);
  if (!lic || lic.userId !== ctx.state.user.id) {
    ctx.status = 404;
    return;
  }
  const filename = `license_hermes_${lic.tier}.key`;
  ctx.set('Content-Type', 'application/octet-stream');
  ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
  ctx.body = lic.licenseKey;
});

/** User resets bound device (before re-activating on another machine). */
licensesRouter.post('/licenses/:id/reset', async (ctx) => {
  if (!requireUser(ctx)) return;
  const lic = getLicenseByKey(ctx.params.id);
  if (!lic || lic.userId !== ctx.state.user.id) {
    ctx.status = 404;
    return;
  }
  if (!lic.boundDevice) {
    ctx.status = 400;
    ctx.body = { error: { code: 'NOT_BOUND', message: 'license is not bound to any device' } };
    return;
  }
  deactivateLicense(ctx.params.id, lic.boundDevice);
  ctx.status = 204;
});

// Admin: list all licenses
licensesRouter.get('/admin/licenses', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  ctx.body = { licenses: listAllLicenses() };
});

// Admin: issue a license for an order
licensesRouter.post('/admin/licenses/issue', async (ctx) => {
  if (!requireAdmin(ctx)) return;
  const b = (ctx.request.body ?? {}) as { orderId?: string; tier?: string };
  const orderId = typeof b.orderId === 'string' ? b.orderId : '';
  const tier = typeof b.tier === 'string' && ['web', 'desktop', 'pro'].includes(b.tier) ? b.tier : 'web';
  if (!orderId) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_BODY', message: 'orderId required' } };
    return;
  }
  const lic = issueLicense(orderId, ctx.state.user.id, tier);
  ctx.status = 201;
  ctx.body = { license: lic };
});
