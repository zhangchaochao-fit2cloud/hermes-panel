import type { Middleware } from 'koa';
import { logger } from '../lib/logger.js';

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string; expose?: boolean };
    const status = e.status ?? 500;
    const code = e.code ?? 'INTERNAL_ERROR';
    const message = e.expose || status < 500 ? (e.message ?? 'error') : 'internal server error';
    logger.error({ err, code, status, path: ctx.path }, 'request failed');
    ctx.status = status;
    ctx.body = { error: { code, message } };
  }
};
