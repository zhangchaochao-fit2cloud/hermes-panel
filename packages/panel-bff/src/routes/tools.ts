import Router from '@koa/router';
import {
  listTools,
  setToolEnabled,
  listSkills,
  browseSkills,
  installSkill,
  uninstallSkill,
} from '../services/hermes-tools.js';

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

// Browse the agentskills.io marketplace.
// Order matters: this must come before the `:name` DELETE route so that
// Koa-router doesn't try to interpret "browse" as a skill name.
toolsRouter.get('/skills/browse', async ctx => {
  const q = ctx.query;
  const search = typeof q.search === 'string' ? q.search : undefined;
  const parsePositiveInt = (v: unknown): number | undefined => {
    if (typeof v !== 'string') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const r = await browseSkills({
    search,
    page: parsePositiveInt(q.page),
    pageSize: parsePositiveInt(q.pageSize),
  });
  ctx.body = r;
});

toolsRouter.post('/skills/:name/install', async ctx => {
  const result = await installSkill(ctx.params.name);
  if (!result.ok) {
    ctx.status = 502;
    ctx.body = { error: { code: result.error ?? 'SKILL_INSTALL_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

toolsRouter.delete('/skills/:name', async ctx => {
  const result = await uninstallSkill(ctx.params.name);
  if (!result.ok) {
    ctx.status = 502;
    ctx.body = { error: { code: result.error ?? 'SKILL_UNINSTALL_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

// GET /mcp lives in routes/mcp.ts together with POST/DELETE.
