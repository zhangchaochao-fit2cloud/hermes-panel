import Router from '@koa/router';
import { readProvidersState, setModel, addCredential } from '../services/hermes-providers.js';

export const providersRouter = new Router();

providersRouter.get('/providers/state', async ctx => {
  ctx.body = await readProvidersState();
});

providersRouter.post('/model', async ctx => {
  const body = ctx.request.body as {
    name?: string; provider?: string; baseUrl?: string; apiKey?: string;
  } | undefined;
  if (!body?.name) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'name is required' } };
    return;
  }
  const r = await setModel({
    name: body.name,
    provider: body.provider,
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
  });
  if (!r.ok) {
    const userErrors = new Set(['MODEL_NAME_REQUIRED']);
    ctx.status = userErrors.has(r.error ?? '') ? 400 : 502;
    ctx.body = { error: { code: r.error ?? 'SET_MODEL_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

providersRouter.post('/providers/credentials', async ctx => {
  const body = ctx.request.body as {
    provider?: string; apiKey?: string; label?: string;
  } | undefined;
  if (!body?.provider || !body?.apiKey) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'provider and apiKey are required' } };
    return;
  }
  const r = await addCredential({
    provider: body.provider,
    apiKey: body.apiKey,
    label: body.label,
  });
  if (!r.ok) {
    const userErrors = new Set(['PROVIDER_REQUIRED', 'API_KEY_REQUIRED']);
    ctx.status = userErrors.has(r.error ?? '') ? 400 : 502;
    ctx.body = { error: { code: r.error ?? 'ADD_CREDENTIAL_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});
