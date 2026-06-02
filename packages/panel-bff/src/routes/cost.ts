import Router from '@koa/router';
import { getCostOverview, getProviders, setProviderLimit, getWorkspaceBudgets, setWorkspaceBudget, analyzeCosts } from '../services/cost-manager.js';

export const costRouter = new Router();

costRouter.get('/cost/overview', async ctx => {
  ctx.body = getCostOverview();
});

costRouter.get('/cost/providers', async ctx => {
  ctx.body = getProviders();
});

costRouter.put('/cost/providers/:name', async ctx => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  if (!body) { ctx.status = 400; return; }
  const result = setProviderLimit(ctx.params.name, body as any);
  ctx.body = result;
});

costRouter.get('/cost/workspaces', async ctx => {
  ctx.body = getWorkspaceBudgets();
});

costRouter.put('/cost/workspaces/:id', async ctx => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  if (!body) { ctx.status = 400; return; }
  const result = setWorkspaceBudget(ctx.params.id, body as any);
  ctx.body = result;
});

costRouter.get('/cost/intelligence', async ctx => {
  const budget = Number(ctx.query.budget) || 50;
  ctx.body = analyzeCosts(budget);
});
