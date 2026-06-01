import type { MessageRow } from './sqlite-reader.js';
import { logger } from '../lib/logger.js';

export interface CompressionResult {
  messages: MessageRow[];
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  compressedCount: number;
  keptCount: number;
}

const TOKEN_THRESHOLD = 0.70;
const KEEP_RECENT = 10;
const MAX_CHARS_PER_SUMMARY = 200;

function estimateTokens(text: string): number {
  if (!text) return 0;
  let chars = 0;
  let cjk = 0;
  for (const ch of text) {
    if (/[一-鿿㐀-䶿豈-﫿]/.test(ch)) {
      cjk++;
    } else {
      chars++;
    }
  }
  return Math.ceil((chars / 4) + (cjk / 1.5));
}

function totalTokens(msgs: MessageRow[]): number {
  return msgs.reduce((sum, m) => sum + estimateTokens(m.content ?? '') + estimateTokens(m.reasoning ?? ''), 0);
}

export function shouldCompress(messages: MessageRow[], modelLimit?: number): boolean {
  if (messages.length <= KEEP_RECENT + 5) return false;
  const limit = modelLimit ?? 128_000;
  const used = totalTokens(messages);
  return used / limit > TOKEN_THRESHOLD;
}

function summarizeMessages(msgs: MessageRow[]): string {
  if (msgs.length === 0) return '';

  const userMessages = msgs.filter(m => m.role === 'user');
  const assistantMessages = msgs.filter(m => m.role === 'assistant');
  const toolCount = msgs.filter(m => m.role === 'tool').length;

  const parts: string[] = [];
  if (userMessages.length > 0) {
    const topics = userMessages
      .map(m => (m.content ?? '').slice(0, MAX_CHARS_PER_SUMMARY))
      .filter(Boolean);
    parts.push(`用户提问(${userMessages.length}条): ${topics.join('; ')}`);
  }
  if (assistantMessages.length > 0) {
    parts.push(`助手回复(${assistantMessages.length}条)`);
  }
  if (toolCount > 0) {
    parts.push(`工具调用(${toolCount}次)`);
  }

  return parts.join(' · ');
}

export function compress(messages: MessageRow[], _modelLimit?: number): CompressionResult {
  const originalTokens = totalTokens(messages);

  if (messages.length <= KEEP_RECENT + 5) {
    return {
      messages,
      originalTokens,
      compressedTokens: originalTokens,
      savedTokens: 0,
      savingsPercent: 0,
      compressedCount: 0,
      keptCount: messages.length,
    };
  }

  const recent = messages.slice(-KEEP_RECENT);
  const old = messages.slice(0, -KEEP_RECENT);

  const summaryContent = summarizeMessages(old);

  const summaryMsg: MessageRow = {
    id: 0,
    session_id: messages[0]?.session_id ?? '',
    role: 'system',
    content: `[上下文已压缩] 早期对话摘要 (${old.length} 条消息): ${summaryContent}`,
    tool_name: null,
    timestamp: old[0]?.timestamp ?? recent[0]?.timestamp ?? 0,
    token_count: null,
    reasoning: null,
  };

  const compressed = [summaryMsg, ...recent];
  const compressedTokens = totalTokens(compressed);

  logger.info({
    originalTokens,
    compressedTokens,
    savedTokens: originalTokens - compressedTokens,
    oldCount: old.length,
    keptCount: recent.length,
  }, 'context compressed');

  return {
    messages: compressed,
    originalTokens,
    compressedTokens,
    savedTokens: originalTokens - compressedTokens,
    savingsPercent: originalTokens > 0
      ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
      : 0,
    compressedCount: old.length,
    keptCount: recent.length,
  };
}
