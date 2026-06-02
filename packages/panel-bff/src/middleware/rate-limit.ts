import type { Middleware } from 'koa';
import { logger } from '../lib/logger.js';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const EXEMPT_PATHS = ['/api/system/health'];

/**
 * Token bucket rate limiter.
 * Each IP gets `maxTokens` tokens, refilled at `maxTokens/windowSec` per second.
 */
export function rateLimitMiddleware(): Middleware {
  const maxTokens = Math.max(10, Number(process.env.PANEL_RATE_LIMIT) || 100);
  const windowSec = 60;
  const refillRate = maxTokens / windowSec;

  const buckets = new Map<string, Bucket>();

  // Cleanup stale buckets every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (now - b.lastRefill > windowSec * 2 * 1000) buckets.delete(key);
    }
  }, 300_000).unref();

  return async (ctx, next) => {
    if (EXEMPT_PATHS.includes(ctx.path)) return next();

    const key = ctx.ip;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate);
      ctx.status = 429;
      ctx.set('Retry-After', String(retryAfter));
      ctx.body = { error: { code: 'RATE_LIMITED', message: `Rate limit exceeded. Retry after ${retryAfter}s.` } };
      logger.warn({ ip: key, path: ctx.path }, 'rate limited');
      return;
    }

    bucket.tokens -= 1;
    return next();
  };
}
