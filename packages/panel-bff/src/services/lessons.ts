/**
 * Lessons Learned — Self-Improving Agent memory.
 *
 * After each task, the system can extract "what worked" and "what didn't".
 * These are stored as structured lessons and injected into future similar tasks.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPanelHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

export interface Lesson {
  id: string;
  trigger: string;          // What situation triggers this lesson (keyword/pattern)
  lesson: string;           // What was learned
  context?: string;         // Additional context (e.g. the original error)
  confidence: number;       // 0-1, increases with successful reuse
  usedCount: number;        // How many times injected
  successCount: number;     // How many times injection led to success
  createdAt: number;
  updatedAt: number;
  tags: string[];           // e.g. ['cors', 'bff', 'middleware']
}

function dataPath(): string {
  const dir = getPanelHome();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return join(dir, 'lessons.json');
}

function loadAll(): Lesson[] {
  const p = dataPath();
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return []; }
}

function saveAll(lessons: Lesson[]): void {
  writeFileSync(dataPath(), JSON.stringify(lessons, null, 2), 'utf8');
}

export function listLessons(): Lesson[] {
  return loadAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLesson(id: string): Lesson | null {
  return loadAll().find(l => l.id === id) ?? null;
}

export function createLesson(data: { trigger: string; lesson: string; context?: string; tags?: string[]; confidence?: number }): Lesson {
  const lessons = loadAll();
  const now = Date.now();
  const entry: Lesson = {
    id: randomUUID(),
    trigger: data.trigger,
    lesson: data.lesson,
    context: data.context,
    confidence: data.confidence ?? 0.7,
    usedCount: 0,
    successCount: 0,
    createdAt: now,
    updatedAt: now,
    tags: data.tags ?? [],
  };
  lessons.push(entry);
  saveAll(lessons);
  logger.info({ id: entry.id, trigger: entry.trigger }, 'lesson created');
  return entry;
}

export function updateLesson(id: string, patch: Partial<Pick<Lesson, 'trigger' | 'lesson' | 'context' | 'tags' | 'confidence'>>): Lesson | null {
  const lessons = loadAll();
  const idx = lessons.findIndex(l => l.id === id);
  if (idx < 0) return null;
  Object.assign(lessons[idx], patch, { updatedAt: Date.now() });
  saveAll(lessons);
  return lessons[idx];
}

export function deleteLesson(id: string): boolean {
  const lessons = loadAll();
  const filtered = lessons.filter(l => l.id !== id);
  if (filtered.length === lessons.length) return false;
  saveAll(filtered);
  return true;
}

/**
 * Find lessons relevant to a given prompt.
 * Uses keyword matching on trigger + tags.
 */
export function findRelevantLessons(prompt: string, maxResults: number = 3): Lesson[] {
  const lessons = loadAll();
  if (lessons.length === 0) return [];

  const promptLower = prompt.toLowerCase();
  const scored: Array<{ lesson: Lesson; score: number }> = [];

  for (const l of lessons) {
    let score = 0;
    // Trigger word match
    const triggerWords = l.trigger.toLowerCase().split(/\s+/);
    for (const word of triggerWords) {
      if (word.length >= 3 && promptLower.includes(word)) score += 2;
    }
    // Tag match
    for (const tag of l.tags) {
      if (promptLower.includes(tag.toLowerCase())) score += 3;
    }
    // Confidence boost
    score *= l.confidence;

    if (score > 0) scored.push({ lesson: l, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.lesson);
}

/**
 * Record that a lesson was used (injected into a prompt).
 * Optionally record whether the outcome was successful.
 */
export function recordUsage(id: string, success?: boolean): void {
  const lessons = loadAll();
  const lesson = lessons.find(l => l.id === id);
  if (!lesson) return;
  lesson.usedCount++;
  if (success === true) {
    lesson.successCount++;
    // Boost confidence on success (capped at 0.95)
    lesson.confidence = Math.min(0.95, lesson.confidence + 0.03);
  } else if (success === false) {
    // Decrease confidence on failure (floored at 0.1)
    lesson.confidence = Math.max(0.1, lesson.confidence - 0.05);
  }
  lesson.updatedAt = Date.now();
  saveAll(lessons);
}

/**
 * Auto-extract lessons from a completed task.
 * This is a simple heuristic: look for patterns in the conversation
 * that indicate learning opportunities.
 */
export function extractLessonsFromConversation(messages: Array<{ role: string; content: string }>): Array<{ trigger: string; lesson: string; tags: string[] }> {
  const suggestions: Array<{ trigger: string; lesson: string; tags: string[] }> = [];

  // Pattern 1: Tool call failed then succeeded (retry pattern)
  const assistantMsgs = messages.filter(m => m.role === 'assistant');
  for (let i = 1; i < assistantMsgs.length; i++) {
    const prev = assistantMsgs[i - 1].content;
    const curr = assistantMsgs[i].content;
    if (/failed|error|错误|失败/.test(prev) && /success|成功|fixed|修复/.test(curr)) {
      // Extract the error topic
      const errorMatch = prev.match(/(?:error|failed|错误|失败)[：:\s]*(.{10,80})/i);
      const fixMatch = curr.match(/(?:fix|solved|修复|解决)[：:\s]*(.{10,80})/i);
      if (errorMatch && fixMatch) {
        const trigger = errorMatch[1].slice(0, 50).trim();
        const lesson = fixMatch[1].slice(0, 100).trim();
        const tags = extractTags(prev + ' ' + curr);
        suggestions.push({ trigger, lesson, tags });
      }
    }
  }

  // Pattern 2: User correction (user says "not X, but Y")
  const userMsgs = messages.filter(m => m.role === 'user');
  for (const msg of userMsgs) {
    const correctionMatch = msg.content.match(/(?:不是|not|别|don't|shouldn't)\s*(.{5,40})[，,]\s*(?:而是|but|应该|should)\s*(.{5,60})/i);
    if (correctionMatch) {
      suggestions.push({
        trigger: correctionMatch[1].trim(),
        lesson: correctionMatch[2].trim(),
        tags: extractTags(msg.content),
      });
    }
  }

  return suggestions;
}

/**
 * Wraps regex-based extraction with a default confidence value
 * for compatibility with the LLM extraction return type.
 */
function fallbackWithConfidence(
  messages: Array<{ role: string; content: string }>,
): Array<{ trigger: string; lesson: string; tags: string[]; confidence: number }> {
  return extractLessonsFromConversation(messages).map(l => ({ ...l, confidence: 0.5 }));
}

/**
 * LLM-assisted lesson extraction.
 * Falls back to regex-based extraction if LLM is unavailable.
 */
export async function extractLessonsWithLLM(
  messages: Array<{ role: string; content: string }>,
  callLLM: (prompt: string) => Promise<string>,
): Promise<Array<{ trigger: string; lesson: string; tags: string[]; confidence: number }>> {
  const conversationSummary = messages
    .slice(-20) // last 20 messages to stay within context
    .map(m => `[${m.role}]: ${m.content.slice(0, 200)}`)
    .join('\n');

  const prompt = `Analyze this conversation and extract reusable lessons learned.
For each lesson, identify:
- trigger: what situation/keyword would indicate this lesson is relevant (short phrase)
- lesson: what was learned (1-2 sentences, actionable)
- tags: relevant technology/domain tags (array of strings)
- confidence: how confident you are this is a real lesson (0.5-0.9)

Return ONLY a JSON array: [{"trigger":"...","lesson":"...","tags":[...],"confidence":0.X}]
If no clear lessons, return [].

Conversation:
${conversationSummary}`;

  try {
    const raw = await callLLM(prompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return fallbackWithConfidence(messages);
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ trigger: string; lesson: string; tags: string[]; confidence: number }>;
    if (!Array.isArray(parsed) || parsed.length === 0) return fallbackWithConfidence(messages);
    // Validate and clamp
    return parsed
      .filter(l => l.trigger && l.lesson)
      .map(l => ({
        trigger: String(l.trigger).slice(0, 100),
        lesson: String(l.lesson).slice(0, 300),
        tags: Array.isArray(l.tags) ? l.tags.map(String).slice(0, 5) : [],
        confidence: Math.min(0.9, Math.max(0.5, Number(l.confidence) || 0.7)),
      }))
      .slice(0, 5);
  } catch {
    return fallbackWithConfidence(messages);
  }
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/CORS|cors/i, 'cors'],
    [/auth|认证|authentication/i, 'auth'],
    [/database|数据库|sqlite|postgres/i, 'database'],
    [/docker|container|容器/i, 'docker'],
    [/typescript|ts|类型/i, 'typescript'],
    [/test|测试/i, 'test'],
    [/deploy|部署|ci.?cd/i, 'deploy'],
    [/api|接口|endpoint/i, 'api'],
    [/css|style|样式/i, 'css'],
    [/config|配置/i, 'config'],
  ];
  for (const [re, tag] of patterns) {
    if (re.test(text)) tags.push(tag);
  }
  return tags;
}
