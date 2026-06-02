import Router from '@koa/router';
import {
  recordUsage,
  readUsageSummary,
  estimateCost,
  inferProvider,
  type UsageEntry,
} from '../services/usage-ledger.js';
import { analyzeCosts } from '../services/cost-intelligence.js';

/**
 * /api/usage — persistent token + cost ledger.
 *
 * POST /api/usage/record — frontend posts one entry per run.completed
 *   The caller may omit `cost` / `provider`; the BFF fills them from the
 *   model name when missing.
 *
 * GET /api/usage — returns today / this-month / all-time totals plus a
 *   per-model breakdown. Always 200; missing ledger yields zero counters.
 */
export const usageRouter = new Router();

function isNonNeg(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

usageRouter.post('/usage/record', async ctx => {
  const body = ctx.request.body as Partial<UsageEntry> | undefined;
  if (!body || typeof body.model !== 'string' || !body.model.trim()) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'model required' } };
    return;
  }
  if (!isNonNeg(body.input) || !isNonNeg(body.output) || !isNonNeg(body.total)) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'input/output/total must be non-negative numbers' } };
    return;
  }

  const model = body.model.trim();
  // Backfill provider / cost server-side so the client can stay dumb.
  const provider = (body.provider && body.provider.trim()) || inferProvider(model);
  const cost = typeof body.cost === 'number' && Number.isFinite(body.cost)
    ? body.cost
    : estimateCost(model, body.input, body.output);

  const entry: UsageEntry = {
    ts: typeof body.ts === 'number' && Number.isFinite(body.ts) ? body.ts : Date.now(),
    sessionId: body.sessionId,
    model,
    provider,
    input: body.input,
    output: body.output,
    total: body.total,
    cost,
  };
  await recordUsage(entry);
  ctx.body = { ok: true, entry };
});

usageRouter.get('/usage', async ctx => {
  ctx.body = await readUsageSummary();
});

usageRouter.get('/usage/intelligence', async ctx => {
  const budget = Number(ctx.query.budget) || 50;
  ctx.body = analyzeCosts(budget);
});
