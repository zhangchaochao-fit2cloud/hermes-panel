import Router from '@koa/router';
import { randomUUID } from 'node:crypto';
import {
  listChatRooms, createChatRoom, deleteChatRoom,
  getChatRoomMessages, addChatRoomMessage,
} from '../services/panel-db.js';

export const chatRoomsRouter = new Router();

chatRoomsRouter.get('/chat-rooms', async ctx => {
  ctx.body = listChatRooms();
});

chatRoomsRouter.post('/chat-rooms', async ctx => {
  const body = ctx.request.body as { name?: string; workspace_name?: string } | undefined;
  if (!body?.name) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'name required' } }; return; }
  const room = createChatRoom({ id: randomUUID(), name: body.name, workspace_name: body.workspace_name });
  ctx.body = room;
});

chatRoomsRouter.patch('/chat-rooms/:id', async ctx => {
  const body = ctx.request.body as { name?: string } | undefined;
  if (!body?.name) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'name required' } }; return; }
  const db = (await import('../services/panel-db.js')).getPanelDb();
  db.prepare('UPDATE chat_rooms SET name = ?, updated_at = ? WHERE id = ?').run(body.name, Math.floor(Date.now() / 1000), ctx.params.id);
  ctx.body = { ok: true };
});

chatRoomsRouter.delete('/chat-rooms/:id', async ctx => {
  const ok = deleteChatRoom(ctx.params.id);
  if (!ok) { ctx.status = 404; ctx.body = { error: { code: 'NOT_FOUND' } }; return; }
  ctx.body = { ok: true };
});

chatRoomsRouter.get('/chat-rooms/:id/messages', async ctx => {
  const limit = Math.min(Number(ctx.query.limit) || 100, 500);
  ctx.body = getChatRoomMessages(ctx.params.id, limit);
});

chatRoomsRouter.post('/chat-rooms/:id/messages', async ctx => {
  const body = ctx.request.body as { role?: string; content?: string; mentions?: Array<{ name: string; icon: string }> } | undefined;
  if (!body?.content) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'content required' } }; return; }

  const userMsg = addChatRoomMessage({
    id: randomUUID(), room_id: ctx.params.id,
    role: 'user', content: body.content,
  });

  const mentions = body.mentions ?? [];
  const agentReplies: Array<{ id: string; agent_name: string; agent_icon: string }> = [];
  for (const m of mentions) {
    const agentMsg = addChatRoomMessage({
      id: randomUUID(), room_id: ctx.params.id,
      role: 'agent', agent_name: m.name, agent_icon: m.icon,
      content: `正在思考 "${body.content.slice(0, 80)}${body.content.length > 80 ? '...' : ''}" ...`,
    });
    agentReplies.push({ id: agentMsg.id, agent_name: m.name, agent_icon: m.icon });
  }

  ctx.body = { userMessage: userMsg, agentReplies };
});
