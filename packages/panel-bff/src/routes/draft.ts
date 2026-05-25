import Router from '@koa/router';

/**
 * Cross-process draft buffer for IDE integrations (VS Code, JetBrains).
 *
 * Spec §13.5: an external tool stages a prompt; the Panel UI picks it up
 * on next mount or via polling and pre-fills the Composer.
 *
 * v0.1: in-memory single-slot store. Drafts older than 5 min expire.
 * v0.2 could persist to disk so the IDE can stage before Panel starts.
 */

interface Draft {
  prompt: string;
  source: string;
  stagedAt: number;
}

let current: Draft | null = null;
const TTL_MS = 5 * 60_000;

function isExpired(d: Draft): boolean {
  return Date.now() - d.stagedAt > TTL_MS;
}

export const draftRouter = new Router();

draftRouter.post('/draft', ctx => {
  const body = ctx.request.body as { prompt?: string; source?: string; stagedAt?: number } | undefined;
  if (!body?.prompt || typeof body.prompt !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'prompt required' } };
    return;
  }
  current = {
    prompt: body.prompt.slice(0, 200_000),
    source: body.source || 'external',
    stagedAt: body.stagedAt || Date.now(),
  };
  ctx.body = { ok: true };
});

draftRouter.get('/draft', ctx => {
  if (current && isExpired(current)) current = null;
  ctx.body = { draft: current };
});

draftRouter.delete('/draft', ctx => {
  current = null;
  ctx.body = { ok: true };
});
