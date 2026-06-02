import Router from '@koa/router';
import { routeModel, getConfig, updateConfig, getRoutingStats, recordRouting, type ComplexityTier } from '../services/model-router.js';

export const modelRouterRouter = new Router();

/** Route a prompt to the optimal model based on complexity */
modelRouterRouter.post('/model-router/route', async ctx => {
  const { prompt } = ctx.request.body as { prompt?: string } ?? {};
  if (!prompt || typeof prompt !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'INVALID_INPUT', message: 'prompt is required' } };
    return;
  }
  ctx.body = routeModel(prompt);
});

/** Get current routing config */
modelRouterRouter.get('/model-router/config', async ctx => {
  ctx.body = getConfig();
});

/** Update routing config */
modelRouterRouter.put('/model-router/config', async ctx => {
  const patch = ctx.request.body as Record<string, unknown> ?? {};
  ctx.body = updateConfig(patch as any);
});

/** Get routing stats (retry rates, savings) */
modelRouterRouter.get('/model-router/stats', async ctx => {
  ctx.body = getRoutingStats();
});

/** Record a routing outcome (called after a run completes or is retried) */
modelRouterRouter.post('/model-router/record', async ctx => {
  const { tier, retried, keywords } = ctx.request.body as { tier?: ComplexityTier; retried?: boolean; keywords?: string[] } ?? {};
  if (!tier) { ctx.status = 400; return; }
  recordRouting(tier, retried ?? false, keywords ?? []);
  ctx.body = { ok: true };
});
