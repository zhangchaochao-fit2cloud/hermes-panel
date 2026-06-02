import Router from '@koa/router';
import { getCostOverview, getProviders, setProviderLimit, getWorkspaceBudgets, setWorkspaceBudget, analyzeCosts } from '../services/cost-manager.js';
import { syncProviderBilling, analyzeOptimizations } from '../services/provider-sync.js';
import { readUsageSummary } from '../services/usage-ledger.js';

export const costRouter = new Router();

costRouter.get('/cost/overview', async ctx => {
  ctx.body = getCostOverview();
});

costRouter.post('/cost/sync', async ctx => {
  const providers = getProviders();
  const configs = providers.map(p => ({
    name: p.provider,
    apiKey: p.apiKey ?? '',
    hardLimit: p.hardLimit,
    softLimit: p.softLimit,
  }));
  const results = await syncProviderBilling(configs);

  // Update provider usage from sync results
  for (const r of results) {
    if (r.currentCost > 0) {
      setProviderLimit(r.provider, { currentUsage: r.currentCost, hardLimit: r.hardLimit });
    }
  }

  ctx.body = { synced: results.length, results };
});

costRouter.get('/cost/optimizations', async ctx => {
  const summary = await readUsageSummary();
  const byModel: Record<string, { tokens: number; cost: number; runs: number }> = {};
  for (const [model, bucket] of Object.entries(summary.byModel)) {
    byModel[model] = { tokens: bucket.tokens, cost: bucket.cost, runs: bucket.runs };
  }
  const optimizations = analyzeOptimizations(byModel, summary.allTime.tokens, summary.allTime.cost);
  ctx.body = { optimizations };
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
