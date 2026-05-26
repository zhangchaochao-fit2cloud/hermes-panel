import Router from '@koa/router';
import { readProvidersState, setModel, addCredential } from '../services/hermes-providers.js';
import { startGateway } from '../services/hermes-gateway.js';
import { logger } from '../lib/logger.js';

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

  // Config change only takes effect when the gateway reloads. `hermes gateway
  // run --replace` swaps the running process in-place; without this the next
  // chat would still hit the old provider/key and 401.
  let restartedGateway = false;
  let restartError: string | undefined;
  try {
    await startGateway();
    restartedGateway = true;
  } catch (err) {
    restartError = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, 'gateway restart after model change failed');
  }
  ctx.body = { ok: true, restartedGateway, restartError };
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
