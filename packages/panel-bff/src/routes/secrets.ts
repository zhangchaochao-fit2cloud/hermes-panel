/**
 * Endpoints for inspecting and updating secrets persisted in the BFF
 * secure store. Only the `exists` check is read-exposed — the actual
 * secret value is intentionally never returned over the wire.
 *
 * Paths:
 *   GET    /api/secrets/hermes-api-key/exists  → { exists: boolean }
 *   PUT    /api/secrets/hermes-api-key         → 204 (body: { value })
 *   DELETE /api/secrets/hermes-api-key         → 204
 */

import Router from '@koa/router';
import { logger } from '../lib/logger.js';
import {
  HERMES_API_KEY_ACCOUNT,
  HERMES_SECRET_SERVICE,
  deleteSecret,
  getSecret,
  setSecret,
} from '../services/secure-store.js';
import { invalidateHermesApiKeyCache } from '../services/hermes-api-key.js';

export const secretsRouter = new Router();

secretsRouter.get('/secrets/hermes-api-key/exists', async ctx => {
  const value = await getSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT);
  ctx.body = { exists: Boolean(value && value.length > 0) };
});

secretsRouter.put('/secrets/hermes-api-key', async ctx => {
  const body = (ctx.request.body ?? {}) as { value?: unknown };
  const value = body.value;
  if (typeof value !== 'string' || value.length === 0) {
    ctx.status = 400;
    ctx.body = {
      error: {
        code: 'INVALID_BODY',
        message: 'expected { value: string } with a non-empty value',
      },
    };
    return;
  }
  await setSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT, value);
  invalidateHermesApiKeyCache();
  logger.info({ len: value.length }, 'hermes api key updated via panel');
  ctx.status = 204;
});

secretsRouter.delete('/secrets/hermes-api-key', async ctx => {
  await deleteSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT);
  invalidateHermesApiKeyCache();
  logger.info('hermes api key cleared via panel');
  ctx.status = 204;
});
