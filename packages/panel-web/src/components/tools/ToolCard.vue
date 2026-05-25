<script setup lang="ts">
import { NSwitch, NTag } from 'naive-ui';
import type { ToolInfo } from '@/stores/tools';

defineProps<{ tool: ToolInfo }>();

const emit = defineEmits<{
  (e: 'toggle', name: string, enabled: boolean): void;
}>();
</script>

<template>
  <div
    class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] transition-shadow"
  >
    <div class="flex items-start gap-3">
      <div class="text-2xl shrink-0">{{ tool.icon || '🔧' }}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-mono text-sm font-medium truncate">{{ tool.name }}</span>
          <NTag v-if="tool.source === 'mcp'" size="small" type="info">MCP</NTag>
          <NTag v-else size="small" :bordered="false">built-in</NTag>
        </div>
        <div class="text-xs text-[var(--text-2)] mb-3 line-clamp-2 min-h-[2.4em]">
          {{ tool.label || '—' }}
        </div>
      </div>
      <NSwitch
        :value="tool.enabled"
        size="small"
        @update:value="(v: boolean) => emit('toggle', tool.name, v)"
      />
    </div>
  </div>
</template>
