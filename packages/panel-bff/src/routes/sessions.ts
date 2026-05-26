import Router from '@koa/router';
import type { SessionSummary } from '@hermes-panel/shared';
import { runHermesCli, HermesCliError } from '../services/hermes-cli.js';
import { exportOne, exportFiltered } from '../services/hermes-export.js';
import { listSessions, getSession, getMessages, type SessionRow, type MessageRow } from '../services/sqlite-reader.js';
import { logger } from '../lib/logger.js';

export const sessionsRouter = new Router();

function normalize(row: SessionRow): SessionSummary {
  const trimmed = row.title?.trim();
  return {
    id: row.id,
    title: trimmed && trimmed.length > 0 ? trimmed : `(${row.id.slice(0, 12)}…)`,
    model: row.model ?? 'unknown',
    messageCount: row.message_count ?? 0,
    tokenTotal: (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
    createdAt: Math.floor((row.started_at ?? 0) * 1000),
    updatedAt: Math.floor(((row.ended_at ?? row.started_at) ?? 0) * 1000),
  };
}

sessionsRouter.get('/sessions', ctx => {
  const limit = Number(ctx.query.limit ?? 100);
  const search = (ctx.query.search as string) || undefined;
  const source = (ctx.query.source as string) || undefined;
  try {
    const rows = listSessions({ limit, search, source });
    ctx.body = rows.map(normalize);
  } catch (err) {
    logger.warn({ err }, 'listSessions failed; returning []');
    ctx.body = [];
  }
});

// Export must be registered before `/sessions/:id` so `/sessions/export`
// doesn't get captured by the wildcard id param. Both endpoints stream JSONL
// back to the browser with a Content-Disposition that triggers a download.
function safeFilenamePart(value: string, fallback: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
  return cleaned.length > 0 ? cleaned : fallback;
}

sessionsRouter.get('/sessions/export', async ctx => {
  const source = (ctx.query.source as string) || undefined;
  try {
    const body = await exportFiltered({ source });
    const name = source
      ? `hermes-sessions-${safeFilenamePart(source, 'all')}.jsonl`
      : 'hermes-sessions-all.jsonl';
    ctx.type = 'text/plain; charset=utf-8';
    ctx.set('Content-Disposition', `attachment; filename="${name}"`);
    ctx.body = body;
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});

sessionsRouter.get('/sessions/:id/export', async ctx => {
  try {
    const body = await exportOne(ctx.params.id);
    const name = `hermes-session-${safeFilenamePart(ctx.params.id, 'session')}.jsonl`;
    ctx.type = 'text/plain; charset=utf-8';
    ctx.set('Content-Disposition', `attachment; filename="${name}"`);
    ctx.body = body;
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});

sessionsRouter.get('/sessions/:id', ctx => {
  const row = getSession(ctx.params.id);
  if (!row) {
    ctx.status = 404;
    ctx.body = { error: { code: 'SESSION_NOT_FOUND', message: 'session not found' } };
    return;
  }
  const messages = getMessages(ctx.params.id);
  ctx.body = {
    ...normalize(row),
    raw: row,
    messages: messages.map((m: MessageRow) => ({
      id: m.id,
      role: m.role,
      content: m.content ?? '',
      reasoning: m.reasoning ?? undefined,
      toolName: m.tool_name ?? undefined,
      timestamp: Math.floor(m.timestamp * 1000),
      tokenCount: m.token_count,
    })),
  };
});

sessionsRouter.delete('/sessions/:id', async ctx => {
  try {
    const result = await runHermesCli(['sessions', 'delete', ctx.params.id, '--yes'], { timeoutMs: 5000 });
    ctx.body = { deleted: true, output: result.stdout.trim() };
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});

sessionsRouter.patch('/sessions/:id', async ctx => {
  const body = ctx.request.body as { title?: string } | undefined;
  if (!body?.title) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'title is required' } };
    return;
  }
  try {
    const result = await runHermesCli(
      ['sessions', 'rename', ctx.params.id, body.title],
      { timeoutMs: 5000 }
    );
    ctx.body = { ok: true, output: result.stdout.trim() };
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});
