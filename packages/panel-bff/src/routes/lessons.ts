import Router from '@koa/router';
import {
  listLessons, getLesson, createLesson, updateLesson, deleteLesson,
  findRelevantLessons, recordUsage, extractLessonsFromConversation,
  extractLessonsWithLLM,
} from '../services/lessons.js';
import { getSessionToken } from '../lib/token.js';

export const lessonsRouter = new Router();

lessonsRouter.get('/lessons', async ctx => {
  ctx.body = listLessons();
});

lessonsRouter.get('/lessons/:id', async ctx => {
  const lesson = getLesson(ctx.params.id);
  if (!lesson) { ctx.status = 404; return; }
  ctx.body = lesson;
});

lessonsRouter.post('/lessons', async ctx => {
  const body = ctx.request.body as { trigger?: string; lesson?: string; context?: string; tags?: string[]; confidence?: number } | undefined;
  if (!body?.trigger || !body?.lesson) { ctx.status = 400; ctx.body = { error: 'trigger and lesson required' }; return; }
  ctx.body = createLesson({ trigger: body.trigger, lesson: body.lesson, context: body.context, tags: body.tags, confidence: body.confidence });
  ctx.status = 201;
});

lessonsRouter.put('/lessons/:id', async ctx => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  if (!body) { ctx.status = 400; return; }
  const result = updateLesson(ctx.params.id, body as any);
  if (!result) { ctx.status = 404; return; }
  ctx.body = result;
});

lessonsRouter.delete('/lessons/:id', async ctx => {
  const ok = deleteLesson(ctx.params.id);
  ctx.status = ok ? 200 : 404;
  ctx.body = { ok };
});

// Find relevant lessons for a prompt
lessonsRouter.post('/lessons/match', async ctx => {
  const { prompt, max } = ctx.request.body as { prompt?: string; max?: number } | undefined ?? {};
  if (!prompt) { ctx.status = 400; return; }
  ctx.body = findRelevantLessons(prompt, max ?? 3);
});

// Record lesson usage outcome
lessonsRouter.post('/lessons/:id/used', async ctx => {
  const { success } = ctx.request.body as { success?: boolean } | undefined ?? {};
  recordUsage(ctx.params.id, success);
  ctx.body = { ok: true };
});

// Auto-extract lessons from a conversation
lessonsRouter.post('/lessons/extract', async ctx => {
  const { messages } = ctx.request.body as { messages?: Array<{ role: string; content: string }> } | undefined ?? {};
  if (!messages || !Array.isArray(messages)) { ctx.status = 400; return; }
  ctx.body = extractLessonsFromConversation(messages);
});

// Smart extraction using LLM
lessonsRouter.post('/lessons/extract-smart', async ctx => {
  const { messages, model } = ctx.request.body as { messages?: Array<{ role: string; content: string }>; model?: string } | undefined ?? {};
  if (!messages || !Array.isArray(messages)) { ctx.status = 400; return; }

  const base = `http://127.0.0.1:${process.env.BFF_PORT || 5667}`;
  const token = getSessionToken();

  async function callLLM(prompt: string): Promise<string> {
    const res = await fetch(`${base}/api/hermes/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
      body: JSON.stringify({ model: model || 'claude-haiku-4-5', input: prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
    const data = await res.json() as { output?: string };
    return data.output ?? '';
  }

  const results = await extractLessonsWithLLM(messages, callLLM);
  ctx.body = results;
});
