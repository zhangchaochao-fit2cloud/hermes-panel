import type { Middleware } from 'koa';
import { recordAuditEntry } from '../services/audit-log.js';

/**
 * Audit middleware — records significant API operations.
 * Only audits mutating requests (POST, PUT, DELETE) and specific sensitive GETs.
 */

const AUDIT_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
const SENSITIVE_GET_PATHS = ['/api/secrets', '/api/sandbox'];

export const auditMiddleware: Middleware = async (ctx, next) => {
  const shouldAudit = AUDIT_METHODS.has(ctx.method) ||
    (ctx.method === 'GET' && SENSITIVE_GET_PATHS.some(p => ctx.path.startsWith(p)));

  if (!shouldAudit) {
    await next();
    return;
  }

  const start = Date.now();
  try {
    await next();
    recordAuditEntry({
      action: `${ctx.method.toLowerCase()}.${ctx.path.replace(/^\/api\//, '').replace(/\//g, '.')}`,
      actor: ctx.state.user ? 'user' : 'system',
      resource: ctx.path,
      details: { status: ctx.status, durationMs: Date.now() - start },
      ip: ctx.ip,
      outcome: ctx.status < 400 ? 'success' : 'failure',
    });
  } catch (err) {
    recordAuditEntry({
      action: `${ctx.method.toLowerCase()}.${ctx.path.replace(/^\/api\//, '').replace(/\//g, '.')}`,
      actor: ctx.state.user ? 'user' : 'system',
      resource: ctx.path,
      details: { error: (err as Error).message },
      ip: ctx.ip,
      outcome: 'failure',
    });
    throw err;
  }
};
