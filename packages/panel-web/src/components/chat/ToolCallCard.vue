<script setup lang="ts">
import type { ToolCall } from '@hermes-panel/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ toolCall: ToolCall }>();
const { t } = useI18n();

const statusLabel = computed(() => t(`chat.toolCall.${props.toolCall.status}`));
const statusIcon = computed(() => {
  switch (props.toolCall.status) {
    case 'pending': return '⏳';
    case 'running': return '⠋';
    case 'done': return '✓';
    case 'error': return '✗';
    default: return '';
  }
});
const durationMs = computed(() =>
  props.toolCall.completedAt ? props.toolCall.completedAt - props.toolCall.startedAt : null
);
</script>

<template>
  <details
    class="rounded-md border-l-4 px-3 py-2 text-xs"
    :class="{
      'border-yellow-400 bg-yellow-50/40': toolCall.status === 'running',
      'border-green-500 bg-green-50/40': toolCall.status === 'done',
      'border-red-500 bg-red-50/40': toolCall.status === 'error',
      'border-zinc-300 bg-zinc-50/40': toolCall.status === 'pending',
    }"
  >
    <summary class="cursor-pointer flex items-center gap-2">
      <span>{{ statusIcon }}</span>
      <span class="font-mono font-medium">{{ toolCall.name }}</span>
      <span class="opacity-60">{{ statusLabel }}</span>
      <span v-if="durationMs != null" class="opacity-60 ml-auto">{{ (durationMs / 1000).toFixed(1) }}s</span>
    </summary>
    <div class="mt-2 space-y-2">
      <div>
        <div class="opacity-60 mb-1">input</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono">{{ JSON.stringify(toolCall.input, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.output !== undefined">
        <div class="opacity-60 mb-1">output</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono">{{ JSON.stringify(toolCall.output, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.errorMessage" class="text-red-600">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>
