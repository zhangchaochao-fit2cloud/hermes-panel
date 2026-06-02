import Router from '@koa/router';
import {
  pollNewSessions,
  checkTokenAlert,
  listEvents,
  markAllRead,
  markRead,
  unreadCount,
  clearAll,
} from '../services/notification-feed.js';

export const notificationsRouter = new Router();

notificationsRouter.get('/notifications', ctx => {
  // Poll fresh sessions on every request — cheap (sqlite) and ensures
  // we don't need a background timer in the BFF.
  pollNewSessions();
  checkTokenAlert();
  const unreadOnly = ctx.query.unread === 'true';
  const limit = Math.min(Math.max(1, Number(ctx.query.limit ?? 50)), 200);
  ctx.body = {
    events: listEvents({ unreadOnly, limit }),
    unreadCount: unreadCount(),
  };
});

notificationsRouter.post('/notifications/read-all', ctx => {
  ctx.body = { marked: markAllRead() };
});

notificationsRouter.post('/notifications/:id/read', ctx => {
  const ok = markRead(ctx.params.id);
  ctx.status = ok ? 200 : 404;
  ctx.body = { ok };
});

notificationsRouter.delete('/notifications', ctx => {
  clearAll();
  ctx.body = { ok: true };
});
