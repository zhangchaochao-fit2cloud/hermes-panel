<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import ToolCallCard from './ToolCallCard.vue';

defineProps<{ message: ChatMessage }>();

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div
    class="flex w-full mb-4 message-enter"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-md px-4 py-3 shadow-[var(--shadow-1)]"
      :class="message.role === 'user'
        ? 'bg-[var(--brand-500)] text-white'
        : 'bg-[var(--bg-card)] border border-[var(--border)]'"
    >
      <!-- reasoning (collapsed by default) -->
      <details v-if="message.reasoning" class="mb-2 text-xs opacity-70">
        <summary class="cursor-pointer">🧠 思考过程</summary>
        <div class="mt-1 whitespace-pre-wrap">{{ message.reasoning }}</div>
      </details>

      <!-- tool calls -->
      <div v-if="message.toolCalls?.length" class="mb-2 space-y-2">
        <ToolCallCard
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool-call="tc"
        />
      </div>

      <!-- content -->
      <div class="whitespace-pre-wrap text-sm leading-relaxed">
        {{ message.content }}<span
          v-if="message.role === 'assistant' && !message.completed"
          class="cursor-blink inline-block w-[2px] h-[1em] align-middle bg-current opacity-70 ml-0.5"
        />
      </div>

      <!-- footer (token usage, time, etc.) -->
      <div
        v-if="message.completed || message.tokenUsage"
        class="mt-2 text-[11px] opacity-50 flex items-center gap-2"
      >
        <span>{{ fmtTime(message.createdAt) }}</span>
        <template v-if="message.tokenUsage">
          <span>·</span>
          <span>{{ message.tokenUsage.total }} tokens</span>
          <span v-if="message.tokenUsage.input">· in {{ message.tokenUsage.input }}</span>
          <span v-if="message.tokenUsage.output">· out {{ message.tokenUsage.output }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
