<script setup lang="ts">
import { computed } from 'vue';
import { NPopover } from 'naive-ui';

const props = defineProps<{
  state: 'connected' | 'connecting' | 'disconnected' | 'unknown';
  label: string;
}>();

const color = computed(() => ({
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-red-500',
  unknown: 'bg-zinc-400',
}[props.state]));
</script>

<template>
  <NPopover trigger="hover" placement="bottom-end" :delay="200">
    <template #trigger>
      <div
        class="inline-flex h-8 max-w-[280px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] px-2.5 text-xs cursor-default"
      >
        <span :class="['inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', color]" />
        <span class="min-w-0 truncate">{{ label }}</span>
      </div>
    </template>
    <div class="text-xs font-mono whitespace-nowrap max-w-[400px]">
      {{ label }}
    </div>
  </NPopover>
</template>
