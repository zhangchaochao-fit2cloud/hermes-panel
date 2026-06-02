import Router from '@koa/router';
import { getDb } from '../services/sqlite-reader.js';

export const searchRouter = new Router();

interface RawMatch {
  id: number;
  session_id: string;
  role: string;
  content: string;
  timestamp: number;
  session_title: string | null;
}

interface GroupedResult {
  sessionId: string;
  sessionTitle: string | null;
  matchCount: number;
  bestMatch: {
    id: number;
    role: string;
    snippet: string;
    timestamp: number;
  };
}

function extractSnippet(content: string, query: string, contextChars: number = 60): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return content.slice(0, 200);
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(content.length, idx + query.length + contextChars);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet += '…';
  return snippet;
}

// GET /api/search/messages?q=<term>&limit=30&group=true
searchRouter.get('/search/messages', async (ctx) => {
  const q = ((ctx.query.q as string) ?? '').trim();
  if (!q || q.length < 2) { ctx.body = { results: [], grouped: [] }; return; }
  const limit = Math.min(Math.max(1, Number(ctx.query.limit) || 50), 200);
  const group = ctx.query.group !== 'false';

  const db = getDb();
  if (!db) { ctx.body = { results: [], grouped: [] }; return; }

  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = db.prepare(`
    SELECT m.id, m.session_id, m.role, m.content, m.timestamp, s.title as session_title
    FROM messages m
    JOIN sessions s ON s.id = m.session_id
    WHERE m.content LIKE @search ESCAPE '\\'
      AND m.content IS NOT NULL
      AND length(trim(m.content)) > 0
    ORDER BY m.timestamp DESC
    LIMIT @limit
  `).all({ search: `%${escaped}%`, limit }) as RawMatch[];

  // Flat results (with contextual snippets)
  const results = rows.map(r => ({
    id: r.id,
    session_id: r.session_id,
    role: r.role,
    snippet: extractSnippet(r.content, q),
    timestamp: r.timestamp,
    session_title: r.session_title,
  }));

  // Grouped by session (deduped, best match per session)
  let grouped: GroupedResult[] = [];
  if (group) {
    const bySession = new Map<string, { count: number; best: RawMatch }>();
    for (const r of rows) {
      const existing = bySession.get(r.session_id);
      if (!existing) {
        bySession.set(r.session_id, { count: 1, best: r });
      } else {
        existing.count++;
        // Keep the most recent match as "best"
        if (r.timestamp > existing.best.timestamp) existing.best = r;
      }
    }
    grouped = [...bySession.entries()].map(([sessionId, { count, best }]) => ({
      sessionId,
      sessionTitle: best.session_title,
      matchCount: count,
      bestMatch: {
        id: best.id,
        role: best.role,
        snippet: extractSnippet(best.content, q),
        timestamp: best.timestamp,
      },
    }));
  }

  ctx.body = { results, grouped, query: q, total: rows.length };
});
