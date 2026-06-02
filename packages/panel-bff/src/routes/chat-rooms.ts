import Router from '@koa/router';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import {
  listChatRooms, createChatRoom, deleteChatRoom,
  getChatRoomMessages, addChatRoomMessage,
} from '../services/panel-db.js';
import {
  generatePlan, getReadyTasks, markTaskDone, markTaskFailed, isPlanComplete, formatPlanSummary,
} from '../services/orchestrator.js';
import { decompose, execute, type OrchestrationPlan } from '../services/orchestrator-v2.js';
import { createGoal, getContinuationPrompt, recordAudit } from '../services/goal-engine.js';
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

interface HermesAgentResult {
  output: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}

async function callHermesAgent(prompt: string, model = 'hermes-agent'): Promise<HermesAgentResult> {
  const base = getApiBase();
  const key = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const startRes = await fetch(`${base}/v1/runs`, {
    method: 'POST', headers,
    body: JSON.stringify({ model, input: prompt, stream: false }),
  });
  if (!startRes.ok) {
    const text = await startRes.text().catch(() => '');
    throw new Error(`Hermes API error ${startRes.status}: ${text.slice(0, 200)}`);
  }

  const { run_id } = await startRes.json() as { run_id: string };

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`${base}/v1/runs/${run_id}/events`, { headers });
    if (!statusRes.ok) continue;
    const text = await statusRes.text();
    const lines = text.split('\n');
    let output = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.event === 'run.completed') {
          output = ev.output || '';
          if (ev.usage) {
            usage = {
              inputTokens: ev.usage.input_tokens || 0,
              outputTokens: ev.usage.output_tokens || 0,
              totalTokens: ev.usage.total_tokens || 0,
            };
          }
        }
        if (ev.event === 'run.error') throw new Error(ev.error || 'Run failed');
      } catch (e) { if (e instanceof Error && e.message !== 'Run failed') throw e; }
    }
    if (output) return { output, usage };
  }
  return { output: '(请求超时)', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
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
          const res = await callHermesAgent(prompt, model);
          const { getPanelDb } = await import('../services/panel-db.js');
          getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?').run(res.output, id);
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

// Orchestrator V2: LLM-driven decomposition + SSE progress streaming
chatRoomsRouter.post('/chat-rooms/:id/orchestrate-v2', async ctx => {
  const body = ctx.request.body as {
    request: string; roles: string[]; tokenBudgetK?: number; turnBudget?: number;
    scopeBoundary?: string; doneWhen?: string[]; stopIf?: string[];
  } | undefined;
  if (!body?.request) { ctx.status = 400; return; }

  const config = {
    objective: body.request, availableRoles: body.roles ?? [],
    tokenBudgetK: body.tokenBudgetK ?? 100, turnBudget: body.turnBudget ?? 10,
    scopeBoundary: body.scopeBoundary, doneWhen: body.doneWhen, stopIf: body.stopIf,
  };

  // SSE stream for real-time progress
  ctx.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  ctx.body = new PassThrough();
  const stream = ctx.body as PassThrough;

  const planMsg = addChatRoomMessage({ id: randomUUID(), room_id: ctx.params.id, role: 'agent', agent_name: 'orchestrator', agent_icon: '🎯', content: '🔍 正在分析需求并生成执行计划...' });

  let plan: OrchestrationPlan;
  try {
    plan = await decompose(config, (p, m) => callHermesAgent(p, m).then(r => r.output));
    // Update with actual plan
    const { getPanelDb } = await import('../services/panel-db.js');
    getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?').run(`📋 ${plan.reasoning}\n${plan.tasks.map((t, i) => `${i + 1}. ${t.role} ${t.description}`).join('\n')}`, planMsg.id);
    stream.write(`data: ${JSON.stringify({ event: 'plan', data: plan })}\n\n`);
  } catch (err) {
    stream.write(`data: ${JSON.stringify({ event: 'error', error: (err as Error).message })}\n\n`);
    stream.end(); return;
  }

  // Execute with progress
  const result = await execute(plan, config, (p, m) => callHermesAgent(p, m).then(r => r.output), (p) => {
    stream.write(`data: ${JSON.stringify({ event: 'progress', data: p })}\n\n`);
  });

  stream.write(`data: ${JSON.stringify({ event: 'done', data: result })}\n\n`);
  stream.end();
});

// Orchestrator: generate a goal-limited plan and auto-dispatch
chatRoomsRouter.post('/chat-rooms/:id/orchestrate', async ctx => {
  const body = ctx.request.body as {
    request: string; roles: string[]; tokenBudgetK?: number; turnBudget?: number;
    scopeBoundary?: string; doneWhen?: string[]; stopIf?: string[];
  } | undefined;
  if (!body?.request) { ctx.status = 400; ctx.body = { error: { code: 'BAD_REQUEST' } }; return; }

  // Create a Goal with budget control
  const goal = createGoal({
    objective: body.request,
    tokenBudgetK: body.tokenBudgetK ?? 100,
    turnBudget: body.turnBudget ?? 10,
    scopeBoundary: body.scopeBoundary,
    doneWhen: body.doneWhen,
    stopIf: body.stopIf,
  });

  const plan = generatePlan(body.request, body.roles ?? []);

  // Post plan as an agent message
  const planMsg = addChatRoomMessage({
    id: randomUUID(), room_id: ctx.params.id,
    role: 'agent', agent_name: 'orchestrator', agent_icon: '🎯',
    content: formatPlanSummary(plan),
  });

  // Auto-dispatch the first batch of ready tasks
  const ready = getReadyTasks(plan);
  const dispatched: Array<{ taskId: string; msgId: string; role: string }> = [];

  for (const task of ready) {
    const mid = randomUUID();
    addChatRoomMessage({
      id: mid, room_id: ctx.params.id,
      role: 'agent', agent_name: task.role, agent_icon: '🤖',
      content: `⏳ ${task.description}`,
    });
    dispatched.push({ taskId: task.id, msgId: mid, role: task.role });
  }

  // Fire-and-forget with budget control
  Promise.allSettled(
    dispatched.map(async ({ taskId, msgId }) => {
      try {
        // Check budget before each task
        getContinuationPrompt(goal);
        if (goal.status === 'budget_limited') {
          addChatRoomMessage({
            id: randomUUID(), room_id: ctx.params.id,
            role: 'agent', agent_name: 'goal-engine', agent_icon: '💰',
            content: `⚠️ Token 预算已耗尽。当前目标「${body.request}」暂停。已完成 ${plan.subtasks.filter(t => t.status === 'done' || t.status === 'failed').length}/${plan.subtasks.length} 个任务。`,
          });
          return;
        }

        const res = await callHermesAgent(body.request);
        recordAudit(goal, { action: `Task: ${body.request.slice(0, 100)}`, result: res.output.slice(0, 200), tokensThisTurn: res.usage.totalTokens, timestamp: Math.floor(Date.now() / 1000) });
        const { getPanelDb } = await import('../services/panel-db.js');
        getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?').run(res.output, msgId);
        markTaskDone(plan, taskId, res.output);

        // Check if there are more tasks to dispatch
        const nextTasks = getReadyTasks(plan);
        for (const nt of nextTasks) {
          const nid = randomUUID();
          addChatRoomMessage({
            id: nid, room_id: ctx.params.id,
            role: 'agent', agent_name: nt.role, agent_icon: '🤖',
            content: `⏳ ${nt.description}`,
          });
          try {
            const r = await callHermesAgent(`基于前面的结果，请完成：${nt.description}`);
            getPanelDb().prepare('UPDATE chat_room_messages SET content = ? WHERE id = ?').run(r.output, nid);
            recordAudit(goal, { action: nt.description, result: r.output.slice(0, 200), tokensThisTurn: r.usage.totalTokens, timestamp: Math.floor(Date.now() / 1000) });
            markTaskDone(plan, nt.id, r.output);
          } catch {
            markTaskFailed(plan, nt.id, 'execution failed');
          }
        }

        // Check if plan is complete
        if (isPlanComplete(plan)) {
          goal.status = 'completed';
          goal.updatedAt = Math.floor(Date.now() / 1000);
          const tokenMsg = goal.tokenBudgetK > 0
            ? `\n💰 Token 消耗: ${goal.tokensUsed.toLocaleString()} / ${(goal.tokenBudgetK * 1000).toLocaleString()}`
            : '';
          addChatRoomMessage({
            id: randomUUID(), room_id: ctx.params.id,
            role: 'agent', agent_name: 'orchestrator', agent_icon: '🎯',
            content: `✅ 所有任务已完成！共执行 ${plan.subtasks.length} 个子任务，${goal.turnsUsed} 轮。${tokenMsg}`,
          });
        }
      } catch (err) {
        markTaskFailed(plan, taskId, (err as Error).message);
      }
    }),
  ).catch(() => {});

  ctx.body = { plan, planMessage: planMsg, dispatched };
});


// Intent-Driven: accept external events and create Goals
chatRoomsRouter.post('/chat-rooms/:id/intent', async ctx => {
  const body = ctx.request.body as { source?: string; title?: string; body?: string; labels?: string[]; repo?: string; priority?: string } | undefined;
  if (!body?.title) { ctx.status = 400; ctx.body = { error: { code: "BAD_REQUEST", message: "title required" } }; return; }
  
  const { processIntent } = await import("../services/intent-driven.js");

  // Use a default set of roles for intent processing
  const availableRoles = ["architect", "backend", "frontend", "qa", "reviewer", "security"];
  const result = await processIntent(
    {
      source: (body.source as any) || "webhook",
      title: body.title,
      body: body.body || "",
      labels: body.labels,
      repo: body.repo,
      priority: (body.priority as any) || "medium",
    },
    ctx.params.id,
    availableRoles,
  );
  
  ctx.body = { ...result, plan: undefined }; // Don't send full plan in response
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
