import Router from '@koa/router';
import { readAuditLog, auditStats } from '../services/audit-log.js';

export const auditRouter = new Router();

auditRouter.get('/audit', async ctx => {
  const limit = Math.min(Math.max(1, Number(ctx.query.limit) || 100), 1000);
  const action = ctx.query.action as string | undefined;
  const since = ctx.query.since ? Number(ctx.query.since) : undefined;
  ctx.body = readAuditLog({ limit, action, since });
});

auditRouter.get('/audit/stats', async ctx => {
  ctx.body = auditStats();
});
