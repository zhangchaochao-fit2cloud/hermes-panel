import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ToolCall, TokenUsage } from '@hermes-panel/shared';

export const useSessionStore = defineStore('session', () => {
  const sessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const tokenUsage = ref<TokenUsage>({ prompt: 0, completion: 0, cached: 0, total: 0 });
  const contextLimit = ref(128_000);

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

  function getOrCreateAssistant(messageId: string): ChatMessage {
    let msg = messages.value.find(m => m.id === messageId);
    if (!msg) {
      msg = {
        id: messageId,
        role: 'assistant',
        content: '',
        reasoning: '',
        toolCalls: [],
        createdAt: Date.now(),
        completed: false,
      };
      messages.value.push(msg);
    }
    return msg;
  }

  function appendDelta(messageId: string, text: string): void {
    const msg = getOrCreateAssistant(messageId);
    msg.content += text;
  }

  function appendReasoning(messageId: string, text: string): void {
    const msg = getOrCreateAssistant(messageId);
    msg.reasoning = (msg.reasoning ?? '') + text;
  }

  function startToolCall(
    messageId: string,
    toolCallId: string,
    name: string,
    input: Record<string, unknown>,
  ): void {
    const msg = getOrCreateAssistant(messageId);
    msg.toolCalls ??= [];
    msg.toolCalls.push({
      id: toolCallId, name, input, status: 'running', startedAt: Date.now(),
    });
  }

  function updateToolCall(toolCallId: string, patch: Partial<ToolCall>): void {
    for (const m of messages.value) {
      if (!m.toolCalls) continue;
      const tc = m.toolCalls.find(t => t.id === toolCallId);
      if (tc) { Object.assign(tc, patch); return; }
    }
  }

  function completeMessage(messageId: string, usage?: TokenUsage): void {
    const msg = getOrCreateAssistant(messageId);
    msg.completed = true;
    if (usage) {
      msg.tokenUsage = usage;
      tokenUsage.value = {
        prompt: tokenUsage.value.prompt + usage.prompt,
        completion: tokenUsage.value.completion + usage.completion,
        cached: tokenUsage.value.cached + usage.cached,
        total: tokenUsage.value.total + usage.total,
        cost: (tokenUsage.value.cost ?? 0) + (usage.cost ?? 0),
      };
    }
  }

  function reset(): void {
    sessionId.value = null;
    messages.value = [];
    tokenUsage.value = { prompt: 0, completion: 0, cached: 0, total: 0 };
  }

  return {
    sessionId, messages, tokenUsage, contextLimit,
    appendUserMessage, getOrCreateAssistant,
    appendDelta, appendReasoning,
    startToolCall, updateToolCall, completeMessage,
    reset,
  };
});
