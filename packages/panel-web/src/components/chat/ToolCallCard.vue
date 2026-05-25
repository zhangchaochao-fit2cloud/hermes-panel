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
    class="rounded-md border-l-4 px-3 py-2 text-xs transition-colors"
    :class="[
      {
        'border-yellow-400 bg-yellow-50/40': toolCall.status === 'running',
        'border-green-500 bg-green-50/40': toolCall.status === 'done',
        'border-red-500 bg-red-50/40': toolCall.status === 'error',
        'border-zinc-300 bg-zinc-50/40': toolCall.status === 'pending',
      },
      toolCall.status === 'running' ? 'tool-running' : '',
    ]"
  >
    <summary class="cursor-pointer flex items-center gap-2 select-none">
      <span class="flex-shrink-0" :class="toolCall.status === 'running' ? 'animate-spin' : ''">
        {{ statusIcon }}
      </span>
      <span class="font-mono font-medium">{{ toolCall.name }}</span>
      <span class="opacity-60 truncate" v-if="toolCall.preview">{{ toolCall.preview }}</span>
      <span class="opacity-60 ml-auto flex-shrink-0">
        <span v-if="durationMs != null">{{ (durationMs / 1000).toFixed(1) }}s</span>
        <span v-else>{{ statusLabel }}</span>
      </span>
    </summary>
    <div class="mt-2 space-y-2">
      <div v-if="toolCall.input && Object.keys(toolCall.input).length > 0">
        <div class="opacity-60 mb-1">input</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono whitespace-pre-wrap break-all">{{ JSON.stringify(toolCall.input, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.output !== undefined">
        <div class="opacity-60 mb-1">output</div>
        <pre class="bg-[var(--bg-elevate)] p-2 rounded font-mono whitespace-pre-wrap break-all">{{ typeof toolCall.output === 'string' ? toolCall.output : JSON.stringify(toolCall.output, null, 2) }}</pre>
      </div>
      <div v-if="toolCall.errorMessage" class="text-red-600">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>
