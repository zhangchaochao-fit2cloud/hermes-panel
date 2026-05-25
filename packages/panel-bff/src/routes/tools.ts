import Router from '@koa/router';
import { listTools, setToolEnabled, listSkills, listMcpServers } from '../services/hermes-tools.js';

export const toolsRouter = new Router();

toolsRouter.get('/tools', async ctx => {
  const r = await listTools();
  ctx.body = r;
});

toolsRouter.patch('/tools/:name', async ctx => {
  const body = ctx.request.body as { enabled?: boolean } | undefined;
  if (typeof body?.enabled !== 'boolean') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'enabled is required' } };
    return;
  }
  const result = await setToolEnabled(ctx.params.name, body.enabled);
  if (!result.ok) {
    ctx.status = 502;
    ctx.body = { error: { code: result.error ?? 'TOOL_TOGGLE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

toolsRouter.get('/skills', async ctx => {
  const r = await listSkills();
  ctx.body = r;
});

toolsRouter.get('/mcp', async ctx => {
  const r = await listMcpServers();
  ctx.body = r;
});
