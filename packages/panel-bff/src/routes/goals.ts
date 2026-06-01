import Router from '@koa/router';
import {
  createGoal, getGoal, pauseGoal, resumeGoal, clearGoal,
  getContinuationPrompt, recordAudit, listGoals,
} from '../services/goal-engine.js';

export const goalsRouter = new Router();

goalsRouter.get('/goals', async ctx => {
  ctx.body = listGoals();
});

goalsRouter.post('/goals', async ctx => {
  const body = ctx.request.body as {
    objective?: string; scopeBoundary?: string;
    doneWhen?: string[]; stopIf?: string[]; tokenBudgetK?: number; turnBudget?: number;
  } | undefined;
  if (!body?.objective) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'objective required' } }; return; }
  const goal = createGoal({ objective: body.objective, ...body });
  ctx.body = goal;
});

goalsRouter.get('/goals/:id', async ctx => {
  const g = getGoal(ctx.params.id);
  if (!g) { ctx.status = 404; return; }
  ctx.body = g;
});

goalsRouter.post('/goals/:id/pause', async ctx => {
  pauseGoal(ctx.params.id);
  ctx.body = { ok: true };
});

goalsRouter.post('/goals/:id/resume', async ctx => {
  resumeGoal(ctx.params.id);
  ctx.body = { ok: true };
});

goalsRouter.delete('/goals/:id', async ctx => {
  clearGoal(ctx.params.id);
  ctx.body = { ok: true };
});

goalsRouter.post('/goals/:id/continue', async ctx => {
  const g = getGoal(ctx.params.id);
  if (!g) { ctx.status = 404; return; }
  const progress = getContinuationPrompt(g);
  ctx.body = progress;
});

goalsRouter.post('/goals/:id/audit', async ctx => {
  const g = getGoal(ctx.params.id);
  if (!g) { ctx.status = 404; return; }
  const body = ctx.request.body as { action?: string; result?: string; tokensThisTurn?: number } | undefined;
  recordAudit(g, {
    action: body?.action ?? 'unknown',
    result: body?.result ?? '',
    tokensThisTurn: body?.tokensThisTurn ?? 0,
    timestamp: Math.floor(Date.now() / 1000),
  });
  ctx.body = { ok: true };
});
