import Router from '@koa/router';
import { PassThrough } from 'node:stream';
import { logger } from '../lib/logger.js';
import {
  isDockerAvailable,
  createSandbox,
  runInSandbox,
  destroySandbox,
  getSandboxStatus,
  SandboxError,
} from '../services/sandbox.js';

export const sandboxRouter = new Router();

sandboxRouter.get('/sandbox/available', async ctx => {
  const available = await isDockerAvailable();
  ctx.body = available
    ? { available: true }
    : { available: false, reason: 'Docker CLI not found or daemon not running' };
});

sandboxRouter.post('/sandbox/create', async ctx => {
  const available = await isDockerAvailable();
  if (!available) {
    ctx.status = 503;
    ctx.body = { error: { code: 'DOCKER_NOT_AVAILABLE', message: 'Docker is not available' } };
    return;
  }

  const { sessionId, workspacePath } = ctx.request.body as { sessionId?: string; workspacePath?: string };
  const id = sessionId ?? `session-${Date.now()}`;

  try {
    const result = await createSandbox(id, workspacePath);
    ctx.body = result;
  } catch (err: unknown) {
    if (err instanceof SandboxError) {
      ctx.status = 500;
      ctx.body = { error: { code: err.code, message: err.message, detail: err.detail } };
      return;
    }
    throw err;
  }
});

sandboxRouter.post('/sandbox/:id/run', async ctx => {
  const { command, timeoutMs } = ctx.request.body as { command: string; timeoutMs?: number };
  if (!command) {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_INPUT', message: 'command is required' } };
    return;
  }

  const available = await isDockerAvailable();
  if (!available) {
    ctx.status = 503;
    ctx.body = { error: { code: 'DOCKER_NOT_AVAILABLE', message: 'Docker is not available' } };
    return;
  }

  ctx.type = 'text/event-stream';
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');

  const pass = new PassThrough();
  ctx.body = pass;

  try {
    const result = await runInSandbox(ctx.params.id, command, { timeoutMs });
    pass.write(`data: ${JSON.stringify(result)}\n\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err, sandboxId: ctx.params.id }, 'sandbox run failed');
    pass.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    pass.end();
  }
});

sandboxRouter.get('/sandbox/:id/status', async ctx => {
  const available = await isDockerAvailable();
  if (!available) {
    ctx.status = 503;
    ctx.body = { error: { code: 'DOCKER_NOT_AVAILABLE', message: 'Docker is not available' } };
    return;
  }

  const status = await getSandboxStatus(ctx.params.id);
  ctx.body = status;
});

sandboxRouter.delete('/sandbox/:id', async ctx => {
  const available = await isDockerAvailable();
  if (!available) {
    ctx.status = 503;
    ctx.body = { error: { code: 'DOCKER_NOT_AVAILABLE', message: 'Docker is not available' } };
    return;
  }

  try {
    await destroySandbox(ctx.params.id);
    ctx.body = { ok: true };
  } catch (err: unknown) {
    if (err instanceof SandboxError) {
      ctx.status = 500;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});
