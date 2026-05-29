import Router from '@koa/router';
import { readWorkspaceStatus } from '../services/workspace-status.js';

export const workspaceStatusRouter = new Router();

workspaceStatusRouter.get('/workspace/status', async ctx => {
  ctx.body = await readWorkspaceStatus();
});
