import Router from '@koa/router';
import type { SessionSummary, SessionSource } from '@hermes-panel/shared';
import { runHermesCli, HermesCliError } from '../services/hermes-cli.js';
import { exportOne, exportFiltered } from '../services/hermes-export.js';
import { listSessions, getSession, getMessages, type SessionRow, type MessageRow } from '../services/sqlite-reader.js';
import { shouldCompress, compress, type CompressionResult } from '../services/context-compressor.js';
import { logger } from '../lib/logger.js';
import { emit } from '../services/sync-bus.js';

export const sessionsRouter = new Router();

function classifySource(raw: string | null | undefined): SessionSource {
  switch (raw) {
    case 'cli': return 'cli';
    case 'cron': return 'cron';
    case 'api_server': return 'api_server';
    default: return 'unknown';
  }
}

// 从首条 user message 拼一个短标题：
//   - 去 markdown 噪声 (```fence、行首 #、*、>、-、列表号)
//   - 折叠空白到单空格，截 30 字符，末尾省略号
//   - 拿到空字符串则返回 null，让 normalize() 走最后兜底
function titleFromMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')         // fenced code blocks
    .replace(/`[^`]*`/g, ' ')                // inline code
    .replace(/^[\s>#*\-+]+/gm, '')           // markdown line prefixes
    .replace(/^\d+\.\s+/gm, '')              // ordered-list markers
    .replace(/^(帮我|请|麻烦|继续|开始|先|再)\s*/u, '')
    .replace(/^(帮我|请|麻烦)?\s*(优化|调整|处理|分析|看看|看下)(一下|下)\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  // 用 Array.from 切，避免 surrogate pair / emoji 切坏
  const chars = Array.from(cleaned);
  return chars.length > 30 ? chars.slice(0, 30).join('') + '…' : cleaned;
}

function looksGeneratedTitle(title: string): boolean {
  const value = title.trim();
  if (!value) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return true;
  if (/^(run|sess|session|chat|cron|job|task|plan)[_-]?[a-z0-9._:-]{8,}$/i.test(value)) return true;
  if (/^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value)) return true;
  if (/^\d{8}([_-]?\d{4,6})?$/.test(value)) return true;
  if (/^[A-Z0-9][A-Z0-9._:-]{15,}$/i.test(value) && !/\s/.test(value)) return true;
  return false;
}

function cleanStoredTitle(title: string): string | null {
  const cleaned = title
    .replace(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}[-_\s]*/g, '')
    .replace(/\b(plan|run|sess|session|chat|cron|job|task)[_-]?\d+\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(run|sess|session|chat|cron|job|task|plan)\s+[a-z0-9\s.:-]{8,}$/i.test(cleaned)) return null;
  if (/^\d[\d\s.:-]{7,}$/.test(cleaned)) return null;
  if (!cleaned || looksGeneratedTitle(cleaned)) return null;
  const chars = Array.from(cleaned);
  return chars.length > 30 ? chars.slice(0, 30).join('') + '…' : cleaned;
}

function normalize(row: SessionRow): SessionSummary {
  const trimmed = row.title?.trim();
  const fromMsg = titleFromMessage(row.first_user_message);
  const fromTitle = trimmed && !looksGeneratedTitle(trimmed)
    ? cleanStoredTitle(trimmed) ?? trimmed
    : null;
  return {
    id: row.id,
    title: fromTitle ?? fromMsg ?? cleanStoredTitle(trimmed ?? '') ?? '',
    model: row.model ?? 'unknown',
    source: classifySource(row.source),
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

sessionsRouter.post('/sessions/:id/compress', ctx => {
  const messages = getMessages(ctx.params.id);
  if (!messages.length) {
    ctx.status = 404;
    ctx.body = { error: { code: 'SESSION_NOT_FOUND', message: 'session not found or empty' } };
    return;
  }
  const body = ctx.request.body as { modelLimit?: number } | undefined;
  const result: CompressionResult = compress(messages, body?.modelLimit);
  ctx.body = {
    canCompress: shouldCompress(messages, body?.modelLimit),
    ...result,
    messages: result.messages.map((m: MessageRow) => ({
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
    emit('session.deleted', { sessionId: ctx.params.id });
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
    emit('session.updated', { sessionId: ctx.params.id, title: body.title });
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
