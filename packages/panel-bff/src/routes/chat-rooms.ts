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
  const body = ctx.request.body as { role?: string; agent_name?: string; agent_icon?: string; content?: string } | undefined;
  if (!body?.content) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'content required' } }; return; }

  // Parse @mentions and dispatch to agents via SSE
  const mentions = parseMentions(body.content);
  const userMsg = addChatRoomMessage({
    id: randomUUID(), room_id: ctx.params.id,
    role: 'user', content: body.content,
  });

  // For each @mention, create an agent reply placeholder
  const agentReplies: Array<{ id: string; agent: string; icon: string }> = [];
  for (const m of mentions) {
    const agentMsg = addChatRoomMessage({
      id: randomUUID(), room_id: ctx.params.id,
      role: 'agent', agent_name: m.name, agent_icon: m.icon,
      content: `正在处理 @${m.name} 的请求...`,
    });
    agentReplies.push({ id: agentMsg.id, agent: m.name, icon: m.icon });
  }

  ctx.body = { userMessage: userMsg, agentReplies };
});

function parseMentions(text: string): Array<{ name: string; icon: string }> {
  const re = /@(\w[\w-]*)/g;
  const seen = new Set<string>();
  const result: Array<{ name: string; icon: string }> = [];
  for (const m of text.matchAll(re)) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      result.push({ name, icon: '🤖' });
    }
  }
  return result;
}
