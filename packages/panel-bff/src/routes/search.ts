import Router from '@koa/router';
import { getDb } from '../services/sqlite-reader.js';

export const searchRouter = new Router();

// GET /api/search/messages?q=<term>&limit=30
searchRouter.get('/search/messages', async (ctx) => {
  const q = ((ctx.query.q as string) ?? '').trim();
  if (!q || q.length < 2) { ctx.body = { results: [] }; return; }
  const limit = Math.min(Math.max(1, Number(ctx.query.limit) || 30), 100);

  const db = getDb();
  if (!db) { ctx.body = { results: [] }; return; }

  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = db.prepare(`
    SELECT m.id, m.session_id, m.role, substr(m.content, 1, 300) as snippet,
           m.timestamp, s.title as session_title
    FROM messages m
    JOIN sessions s ON s.id = m.session_id
    WHERE m.content LIKE @search ESCAPE '\\'
      AND m.content IS NOT NULL
      AND length(trim(m.content)) > 0
    ORDER BY m.timestamp DESC
    LIMIT @limit
  `).all({ search: `%${escaped}%`, limit });

  ctx.body = { results: rows, query: q };
});
