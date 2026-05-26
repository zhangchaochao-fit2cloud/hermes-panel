import Router from '@koa/router';
import {
  listWebhooks,
  addWebhook,
  removeWebhook,
  testWebhook,
  type AddWebhookInput,
} from '../services/hermes-webhook.js';

export const webhookRouter = new Router();

webhookRouter.get('/webhooks', async ctx => {
  ctx.body = await listWebhooks();
});

webhookRouter.post('/webhooks', async ctx => {
  const body = ctx.request.body as Partial<AddWebhookInput> | undefined;
  if (!body?.name || typeof body.name !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'name is required' } };
    return;
  }
  const r = await addWebhook({
    name: body.name,
    prompt: body.prompt,
    events: body.events,
    description: body.description,
    skills: body.skills,
    deliver: body.deliver,
    deliverChatId: body.deliverChatId,
    secret: body.secret,
  });
  if (!r.ok) {
    const userErrors = new Set(['NAME_REQUIRED', 'INVALID_NAME']);
    ctx.status = userErrors.has(r.error ?? '') ? 400 : 502;
    ctx.body = {
      error: {
        code: r.error ?? 'WEBHOOK_ADD_FAILED',
        message: r.stderr?.trim() || 'failed',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

webhookRouter.delete('/webhooks/:id', async ctx => {
  const r = await removeWebhook(ctx.params.id);
  if (!r.ok) {
    ctx.status = r.error === 'NAME_REQUIRED' ? 400 : 502;
    ctx.body = { error: { code: r.error ?? 'WEBHOOK_REMOVE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

webhookRouter.post('/webhooks/:id/test', async ctx => {
  const body = (ctx.request.body ?? {}) as { payload?: string };
  const r = await testWebhook({ name: ctx.params.id, payload: body.payload });
  if (!r.ok) {
    const userErrors = new Set(['NAME_REQUIRED', 'INVALID_PAYLOAD']);
    ctx.status = userErrors.has(r.error ?? '') ? 400 : 502;
    ctx.body = {
      ok: false,
      error: {
        code: r.error ?? 'WEBHOOK_TEST_FAILED',
        message: r.stderr?.trim() || 'failed',
      },
      stderr: r.stderr,
    };
    return;
  }
  ctx.body = { ok: true, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
});
