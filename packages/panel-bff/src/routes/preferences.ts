import Router from '@koa/router';
import { readPinnedSessions, writePinnedSessions } from '../services/pinned-sessions.js';

export const preferencesRouter = new Router();

preferencesRouter.get('/preferences/pinned-sessions', async ctx => {
  ctx.body = { ids: await readPinnedSessions() };
});

preferencesRouter.put('/preferences/pinned-sessions', async ctx => {
  const body = ctx.request.body as { ids?: unknown } | undefined;
  if (!body || !Array.isArray(body.ids)) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'ids must be an array' } };
    return;
  }

  const ids = await writePinnedSessions(body.ids.filter(id => typeof id === 'string'));
  ctx.body = { ids };
});
