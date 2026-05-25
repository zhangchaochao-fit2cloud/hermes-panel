<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import ToolCallCard from './ToolCallCard.vue';

defineProps<{ message: ChatMessage }>();
</script>

<template>
  <div
    class="flex w-full mb-4"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-md px-4 py-3"
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
      <div class="whitespace-pre-wrap text-sm">{{ message.content }}</div>

      <!-- footer (token usage, etc.) -->
      <div v-if="message.tokenUsage" class="mt-2 text-xs opacity-60">
        {{ message.tokenUsage.total }} tokens
        <span v-if="message.tokenUsage.cost != null">· ${{ message.tokenUsage.cost.toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>
