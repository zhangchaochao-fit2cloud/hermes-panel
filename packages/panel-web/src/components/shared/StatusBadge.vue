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
      <button
        type="button"
        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        :aria-label="label"
      >
        <span :class="['inline-block w-2 h-2 rounded-full', color]" />
      </button>
    </template>
    <div class="text-xs font-mono whitespace-nowrap max-w-[400px] px-1">
      {{ label }}
    </div>
  </NPopover>
</template>
