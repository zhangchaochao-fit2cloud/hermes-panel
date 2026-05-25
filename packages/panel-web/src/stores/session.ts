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

  function startToolCall(name: string, preview?: string): void {
    const msg = getCurrentAssistant();
    msg.toolCalls ??= [];
    msg.toolCalls.push({
      id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      input: preview ? { preview } : {},
      preview,
      status: 'running',
      startedAt: Date.now(),
    });
  }

  function completeToolCall(name: string, opts: { error?: boolean; durationSec?: number }): void {
    const msg = getCurrentAssistant();
    if (!msg.toolCalls) return;
    // Find the most recent matching running tool call
    for (let i = msg.toolCalls.length - 1; i >= 0; i--) {
      const tc = msg.toolCalls[i];
      if (tc.name === name && tc.status === 'running') {
        Object.assign(tc, {
          status: opts.error ? 'error' : 'done',
          completedAt: opts.durationSec != null ? tc.startedAt + opts.durationSec * 1000 : Date.now(),
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

  return {
    sessionId, messages, tokenUsage, contextLimit,
    appendUserMessage, startAssistantMessage, getCurrentAssistant,
    appendDelta, appendReasoning,
    startToolCall, completeToolCall, updateToolCall,
    completeRun,
    reset,
  };
});
