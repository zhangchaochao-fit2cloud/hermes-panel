import Router from '@koa/router';
import {
  listPlugins,
  installPlugin,
  updatePlugin,
  removePlugin,
  enablePlugin,
  disablePlugin,
} from '../services/hermes-plugins.js';

export const pluginsRouter = new Router();

/** Error codes that map to a 400 rather than a 502. */
const VALIDATION_CODES = new Set([
  'NAME_REQUIRED',
  'INVALID_NAME',
  'SOURCE_REQUIRED',
  'INVALID_SOURCE',
]);

function statusFor(code: string | undefined): number {
  if (!code) return 502;
  if (VALIDATION_CODES.has(code)) return 400;
  if (code === 'PLUGIN_NOT_FOUND') return 404;
  if (code === 'PLUGIN_ALREADY_EXISTS') return 409;
  return 502;
}

pluginsRouter.get('/plugins', async ctx => {
  const r = await listPlugins();
  ctx.body = r;
});

pluginsRouter.post('/plugins', async ctx => {
  const body = ctx.request.body as { source?: unknown } | undefined;
  const source = typeof body?.source === 'string' ? body.source : '';
  const result = await installPlugin(source);
  if (!result.ok) {
    ctx.status = statusFor(result.error);
    ctx.body = {
      error: {
        code: result.error ?? 'PLUGIN_INSTALL_FAILED',
        message: result.detail || 'failed to install plugin',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

pluginsRouter.post('/plugins/:name/update', async ctx => {
  const result = await updatePlugin(ctx.params.name);
  if (!result.ok) {
    ctx.status = statusFor(result.error);
    ctx.body = {
      error: {
        code: result.error ?? 'PLUGIN_UPDATE_FAILED',
        message: result.detail || 'failed to update plugin',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

pluginsRouter.delete('/plugins/:name', async ctx => {
  const result = await removePlugin(ctx.params.name);
  if (!result.ok) {
    ctx.status = statusFor(result.error);
    ctx.body = {
      error: {
        code: result.error ?? 'PLUGIN_REMOVE_FAILED',
        message: result.detail || 'failed to remove plugin',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

pluginsRouter.post('/plugins/:name/enable', async ctx => {
  const result = await enablePlugin(ctx.params.name);
  if (!result.ok) {
    ctx.status = statusFor(result.error);
    ctx.body = {
      error: {
        code: result.error ?? 'PLUGIN_ENABLE_FAILED',
        message: result.detail || 'failed to enable plugin',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

pluginsRouter.post('/plugins/:name/disable', async ctx => {
  const result = await disablePlugin(ctx.params.name);
  if (!result.ok) {
    ctx.status = statusFor(result.error);
    ctx.body = {
      error: {
        code: result.error ?? 'PLUGIN_DISABLE_FAILED',
        message: result.detail || 'failed to disable plugin',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});
