import Router from '@koa/router';
import { listMemory, readMemory, writeMemory, deleteMemory } from '../services/hermes-memory.js';

export const memoryRouter = new Router();

memoryRouter.get('/memory', ctx => { ctx.body = listMemory(); });

memoryRouter.get('/memory/file', ctx => {
  const path = (ctx.query.path as string) || '';
  if (!path) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'path required' } }; return; }
  const r = readMemory(path);
  if (r.error) {
    ctx.status = r.error === 'NOT_FOUND' ? 404 : 400;
    ctx.body = { error: { code: r.error, message: 'failed' } };
    return;
  }
  ctx.body = { content: r.content, path };
});

memoryRouter.put('/memory/file', ctx => {
  const body = ctx.request.body as { path?: string; content?: string } | undefined;
  if (!body?.path || typeof body.content !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'path and content required' } };
    return;
  }
  const r = writeMemory(body.path, body.content);
  if (!r.ok) {
    ctx.status = r.error === 'INVALID_PATH' ? 400 : 500;
    ctx.body = { error: { code: r.error ?? 'WRITE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

memoryRouter.delete('/memory/file', ctx => {
  const path = (ctx.query.path as string) || '';
  if (!path) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'path required' } };
    return;
  }
  const r = deleteMemory(path);
  if (!r.ok) {
    ctx.status = r.error === 'NOT_FOUND' ? 404
      : r.error === 'INVALID_PATH' ? 400 : 500;
    ctx.body = { error: { code: r.error ?? 'DELETE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});
