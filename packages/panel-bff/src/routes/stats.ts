import Router from '@koa/router';
import {
  overallStats,
  dailyTokenUsage,
  modelDistribution,
  cacheStats,
  monthlyPace,
  toolUsage,
  orchestrationStats,
} from '../services/sqlite-reader.js';

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

statsRouter.get('/stats/cache', ctx => {
  const days = Math.min(Math.max(1, Number(ctx.query.days ?? 30)), 365);
  ctx.body = cacheStats(days);
});

statsRouter.get('/stats/pace', ctx => {
  ctx.body = monthlyPace();
});

statsRouter.get('/stats/tools', ctx => {
  const days = Math.min(Math.max(1, Number(ctx.query.days ?? 30)), 365);
  ctx.body = toolUsage(days);
});

statsRouter.get('/stats/orchestration', ctx => {
  ctx.body = orchestrationStats();
});
