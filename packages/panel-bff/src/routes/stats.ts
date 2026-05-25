import Router from '@koa/router';
import { overallStats, dailyTokenUsage, modelDistribution } from '../services/sqlite-reader.js';

export const statsRouter = new Router();

statsRouter.get('/stats/overall', ctx => {
  ctx.body = overallStats();
});

statsRouter.get('/stats/daily', ctx => {
  const days = Math.min(Math.max(1, Number(ctx.query.days ?? 7)), 90);
  ctx.body = dailyTokenUsage(days);
});

statsRouter.get('/stats/models', ctx => {
  const days = Math.min(Math.max(1, Number(ctx.query.days ?? 30)), 365);
  ctx.body = modelDistribution(days);
});
