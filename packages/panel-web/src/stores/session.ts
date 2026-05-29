import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ToolCall, TokenUsage } from '@hermes-panel/shared';
import { scoreResponse } from '@/utils/quality-score';

/**
 * Hermes streams responses without a stable assistant message id per run,
 * so we maintain a single "current" assistant message per send. A new send()
 * starts a fresh assistant message; deltas and tool events attach to it.
 */
export const useSessionStore = defineStore('session', () => {
  const sessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const tokenUsage = ref<TokenUsage>({ input: 0, output: 0, total: 0 });
  const contextLimit = ref(128_000);

  let currentAssistantId: string | null = null;

  function appendUserMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content,
      createdAt: Date.now(),
      completed: true,
    };
    messages.value.push(msg);
    return msg;
  }

  function startAssistantMessage(): ChatMessage {
    const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [],
      createdAt: Date.now(),
      completed: false,
    };
    messages.value.push(msg);
    currentAssistantId = id;
    return msg;
  }

  function getCurrentAssistant(): ChatMessage {
    if (currentAssistantId) {
      const m = messages.value.find(x => x.id === currentAssistantId);
      if (m) return m;
    }
    return startAssistantMessage();
  }

  function appendDelta(text: string): void {
    const msg = getCurrentAssistant();
    msg.content += text;
  }

  function appendReasoning(text: string): void {
    const msg = getCurrentAssistant();
    msg.reasoning = (msg.reasoning ?? '') + text;
  }

  function startToolCall(name: string, preview?: string, input: Record<string, unknown> = {}): void {
    const msg = getCurrentAssistant();
    msg.toolCalls ??= [];
    msg.toolCalls.push({
      id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      input: preview ? { preview, ...input } : input,
      preview,
      status: 'running',
      startedAt: Date.now(),
    });
  }

  function completeToolCall(name: string, opts: { error?: boolean; durationSec?: number; output?: unknown; errorMessage?: string; input?: Record<string, unknown> }): void {
    const msg = getCurrentAssistant();
    if (!msg.toolCalls) return;
    // Find the most recent matching running tool call
    for (let i = msg.toolCalls.length - 1; i >= 0; i--) {
      const tc = msg.toolCalls[i];
      if (tc.name === name && tc.status === 'running') {
        Object.assign(tc, {
          status: opts.error ? 'error' : 'done',
          completedAt: opts.durationSec != null ? tc.startedAt + opts.durationSec * 1000 : Date.now(),
          input: opts.input ? { ...tc.input, ...opts.input } : tc.input,
          ...(opts.output !== undefined ? { output: opts.output } : {}),
          ...(opts.errorMessage ? { errorMessage: opts.errorMessage } : {}),
        });
        return;
      }
    }
  }

  function updateToolCall(toolCallId: string, patch: Partial<ToolCall>): void {
    for (const m of messages.value) {
      if (!m.toolCalls) continue;
      const tc = m.toolCalls.find(t => t.id === toolCallId);
      if (tc) { Object.assign(tc, patch); return; }
    }
  }

  function completeRun(output: string | undefined, usage?: { input?: number; output?: number; total?: number }): void {
    const msg = getCurrentAssistant();
    msg.completed = true;
    msg.completedAt = Date.now();
    // If we never got deltas (rare), fall back to `output`
    if (!msg.content && output) msg.content = output;
    // Score the response locally (cheap heuristic, no LLM call)
    const lastUser = [...messages.value].reverse().find(m => m.role === 'user');
    const score = scoreResponse(msg.content, lastUser?.content);
    msg.qualityScore = score.quality;
    msg.hallucinationRisk = score.hallucinationRisk;
    if (usage) {
      const u: TokenUsage = {
        input: usage.input ?? 0,
        output: usage.output ?? 0,
        total: usage.total ?? (usage.input ?? 0) + (usage.output ?? 0),
      };
      msg.tokenUsage = u;
      tokenUsage.value = {
        input: tokenUsage.value.input + u.input,
        output: tokenUsage.value.output + u.output,
        total: tokenUsage.value.total + u.total,
      };
    }
    currentAssistantId = null;
  }

  function reset(): void {
    sessionId.value = null;
    messages.value = [];
    tokenUsage.value = { input: 0, output: 0, total: 0 };
    currentAssistantId = null;
  }

  function branchAt(messageId: string): boolean {
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index < 0) return false;
    messages.value = messages.value.slice(0, index + 1).map(message => ({ ...message }));
    sessionId.value = null;
    currentAssistantId = null;
    tokenUsage.value = messages.value.reduce<TokenUsage>((acc, message) => {
      if (message.tokenUsage) {
        acc.input += message.tokenUsage.input;
        acc.output += message.tokenUsage.output;
        acc.total += message.tokenUsage.total;
      }
      return acc;
    }, { input: 0, output: 0, total: 0 });
    return true;
  }

  /**
   * 在某条 user message 处就地编辑。把它之前的消息保留、替换该条内容、
   * 截断它之后所有消息。返回新内容供调用方 stream.send 重新跑。
   * 注意：该会话的 sessionId 仍保留 — hermes 会在同一 session 续上
   * 新的 turn（与 fork 行为不同）。
   */
  function editUserMessageAt(messageId: string, newContent: string): string | null {
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index < 0) return null;
    const target = messages.value[index];
    if (target.role !== 'user') return null;
    messages.value = messages.value.slice(0, index).map(m => ({ ...m }));
    currentAssistantId = null;
    // 重新累计 token（只剩前置 turns）
    tokenUsage.value = messages.value.reduce<TokenUsage>((acc, m) => {
      if (m.tokenUsage) {
        acc.input += m.tokenUsage.input;
        acc.output += m.tokenUsage.output;
        acc.total += m.tokenUsage.total;
      }
      return acc;
    }, { input: 0, output: 0, total: 0 });
    return newContent;
  }

  return {
    sessionId, messages, tokenUsage, contextLimit,
    appendUserMessage, startAssistantMessage, getCurrentAssistant,
    appendDelta, appendReasoning,
    startToolCall, completeToolCall, updateToolCall,
    completeRun,
    branchAt,
    editUserMessageAt,
    reset,
  };
});
