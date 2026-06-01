import Router from '@koa/router';
import { listFiles, readFile, writeFileContent } from '../services/hermes-files.js';

export const filesRouter = new Router();

filesRouter.get('/files/tree', ctx => {
  const path = (ctx.query.path as string) || '';
  const r = listFiles(path || undefined);
  if (r.error) {
    ctx.status = r.error === 'INVALID_PATH' || r.error === 'ACCESS_DENIED' ? 403
      : r.error === 'DIR_NOT_FOUND' ? 404 : 500;
    ctx.body = { tree: [], error: r.error };
    return;
  }
  ctx.body = { tree: r.tree };
});

filesRouter.get('/files/read', ctx => {
  const path = (ctx.query.path as string) || '';
  if (!path) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'path required' } };
    return;
  }
  const r = readFile(path);
  if (r.error) {
    ctx.status = r.error === 'NOT_FOUND' ? 404 : r.error === 'FILE_TOO_LARGE' ? 413 : 400;
    ctx.body = { error: { code: r.error, message: 'failed' } };
    return;
  }
  ctx.body = { path: r.path, content: r.content, size: r.size, language: r.language };
});

filesRouter.put('/files/write', ctx => {
  const body = ctx.request.body as { path?: string; content?: string } | undefined;
  if (!body?.path || typeof body.content !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'path and content required' } };
    return;
  }
  const r = writeFileContent(body.path, body.content);
  if (!r.ok) {
    ctx.status = r.error === 'INVALID_PATH' ? 403 : 500;
    ctx.body = { error: { code: r.error ?? 'WRITE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});
