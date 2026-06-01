import Router from '@koa/router';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import {
  listChatRooms, createChatRoom, deleteChatRoom,
  getChatRoomMessages, addChatRoomMessage,
} from '../services/panel-db.js';
import { getHermesHome } from '../services/hermes-home.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../lib/logger.js';

export const chatRoomsRouter = new Router();

function getApiBase(): string {
  return process.env.HERMES_API_BASE ?? 'http://127.0.0.1:8642';
}

function getApiKey(): string {
  if (process.env.HERMES_API_KEY) return process.env.HERMES_API_KEY;
  const authPath = join(getHermesHome(), 'auth.json');
  if (existsSync(authPath)) {
    try { const auth = JSON.parse(readFileSync(authPath, 'utf8')); return auth.api_key ?? ''; } catch { /**/ }
  }
  return '';
}

async function callHermesAgent(prompt: string, model = 'hermes-agent'): Promise<string> {
  const base = getApiBase();
  const key = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  // Hermes uses /v1/runs for chat completions
  const startRes = await fetch(`${base}/v1/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, input: prompt, stream: false }),
  });
  if (!startRes.ok) {
    const text = await startRes.text().catch(() => '');
    throw new Error(`Hermes API error ${startRes.status}: ${text.slice(0, 200)}`);
  }

  const { run_id } = await startRes.json() as { run_id: string };

  // Poll for completion (non-streaming mode)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`${base}/v1/runs/${run_id}/events`, { headers });
    if (!statusRes.ok) continue;
    const text = await statusRes.text();
    // Parse SSE events to extract final output
    const lines = text.split('\n');
    let output = '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.event === 'run.completed' && ev.output) output = ev.output;
        if (ev.event === 'run.error') throw new Error(ev.error || 'Run failed');
      } catch (e) { if (e instanceof Error && e.message !== 'Run failed') throw e; }
    }
    if (output) return output;
  }
  return '(请求超时，Agent 未在 30 秒内返回结果)';
}

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
  const { getPanelDb } = await import('../services/panel-db.js');
  getPanelDb().prepare('UPDATE chat_rooms SET name = ?, updated_at = ? WHERE id = ?').run(body.name, Math.floor(Date.now() / 1000), ctx.params.id);
  ctx.body = { ok: true };
});

chatRoomsRouter.delete('/chat-rooms/:id', async ctx => {
  const ok = deleteChatRoom(ctx.params.id);
  if (!ok) { ctx.status = 404; ctx.body = { error: { code: 'NOT_FOUND' } }; return; }
  ctx.body = { ok: true };
});

chatRoomsRouter.get('/chat-rooms/:id/messages', async ctx => {
  ctx.body = getChatRoomMessages(ctx.params.id, Math.min(Number(ctx.query.limit) || 100, 500));
});

chatRoomsRouter.post('/chat-rooms/:id/messages', async ctx => {
  const body = ctx.request.body as { role?: string; content?: string; mentions?: Array<{ name: string; icon: string; prompt?: string; model?: string }> } | undefined;
  if (!body?.content) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST', message: 'content required' } }; return; }

  const userMsg = addChatRoomMessage({
    id: randomUUID(), room_id: ctx.params.id,
    role: 'user', content: body.content,
  });

  const mentions = body.mentions ?? [];
  const agentReplies: Array<{ id: string; agent_name: string; agent_icon: string }> = [];
  const agentPlaceholders: Array<{ id: string; name: string; prompt: string; model?: string }> = [];

  for (const m of mentions) {
    const mid = randomUUID();
    addChatRoomMessage({
      id: mid, room_id: ctx.params.id,
      role: 'agent', agent_name: m.name, agent_icon: m.icon,
      content: `⏳ 正在用 ${m.model || '默认模型'} 思考...`,
    });
    agentReplies.push({ id: mid, agent_name: m.name, agent_icon: m.icon });
    agentPlaceholders.push({ id: mid, name: m.name, prompt: m.prompt || body.content, model: m.model });
  }

  // Fire-and-forget: call Hermes for each mentioned agent, update messages
  if (agentPlaceholders.length > 0) {
    Promise.allSettled(
      agentPlaceholders.map(async ({ id, name, prompt, model }) => {
        try {
          const response = await callHermesAgent(prompt, model);
          // Update the placeholder with real response
          const { getPanelDb } = await import('../services/panel-db.js');
          getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?').run(response, id);
        } catch (err) {
          const { getPanelDb } = await import('../services/panel-db.js');
          getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?')
            .run(`❌ 回复失败: ${(err as Error).message.slice(0, 200)}`, id);
          logger.warn({ err, agent: name }, 'chat-room agent reply failed');
        }
      }),
    ).catch(() => { /* fire-and-forget */ });
  }

  ctx.body = { userMessage: userMsg, agentReplies };
});

// SSE endpoint: poll for updates to agent messages
chatRoomsRouter.get('/chat-rooms/:id/stream', async ctx => {
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  ctx.body = new PassThrough();

  const stream = ctx.body as PassThrough;
  const roomId = ctx.params.id;
  let lastCount = getChatRoomMessages(roomId).length;

  const timer = setInterval(() => {
    const msgs = getChatRoomMessages(roomId);
    if (msgs.length > lastCount) {
      const newMsgs = msgs.slice(lastCount);
      lastCount = msgs.length;
      stream.write(`data: ${JSON.stringify({ event: 'messages', data: newMsgs })}\n\n`);
    }
    // Check if all agent messages have finished (no more "⏳")
    const pending = msgs.filter(m => m.content?.startsWith('⏳'));
    if (pending.length === 0 && msgs.length > 0) {
      stream.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
      clearInterval(timer);
      stream.end();
    }
  }, 800);

  ctx.req.on('close', () => { clearInterval(timer); stream.end(); });
});
