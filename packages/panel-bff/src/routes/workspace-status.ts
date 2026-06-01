import Router from '@koa/router';
import { readWorkspaceStatus } from '../services/workspace-status.js';

export const workspaceStatusRouter = new Router();

workspaceStatusRouter.get('/workspace/status', async ctx => {
  const cwd = typeof ctx.query.cwd === 'string' ? ctx.query.cwd : null;
  ctx.body = await readWorkspaceStatus(cwd);
});
