import Router from '@koa/router';
import { runProactiveScan } from '../services/proactive-agent.js';

export const proactiveRouter = new Router();

proactiveRouter.get('/proactive/scan', async ctx => {
  const cwd = ctx.query.cwd as string | undefined;
  ctx.body = await runProactiveScan(cwd || undefined);
});
