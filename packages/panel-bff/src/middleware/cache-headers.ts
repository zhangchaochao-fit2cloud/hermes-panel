import type { Middleware } from 'koa';

export function cacheHeaders(
  maxAge: number,
  opts?: { private?: boolean; immutable?: boolean },
): Middleware {
  const isPrivate = opts?.private !== false;
  const isImmutable = opts?.immutable ?? false;

  return async (ctx, next) => {
    await next();
    const directives: string[] = [];
    if (isPrivate) directives.push('private');
    directives.push(`max-age=${maxAge}`);
    if (isImmutable) directives.push('immutable');
    ctx.set('Cache-Control', directives.join(', '));
  };
}
