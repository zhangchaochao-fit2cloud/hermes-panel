import type { Middleware } from 'koa';
import { createHash } from 'node:crypto';

export function etag(): Middleware {
  return async (ctx, next) => {
    await next();

    if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return;
    if (ctx.status !== 200) return;
    if (ctx.body == null) return;

    const raw =
      typeof ctx.body === 'string'
        ? ctx.body
        : typeof ctx.body === 'object'
          ? JSON.stringify(ctx.body)
          : '';

    if (!raw) return;

    const hash = createHash('md5').update(raw).digest('hex');
    const etagVal = `"${hash}"`;
    ctx.set('ETag', etagVal);

    if (ctx.headers['if-none-match'] === etagVal) {
      ctx.status = 304;
      ctx.body = null;
    }
  };
}
