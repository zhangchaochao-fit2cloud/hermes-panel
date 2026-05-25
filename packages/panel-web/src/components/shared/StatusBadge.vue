<script setup lang="ts">
import { computed } from 'vue';

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
  <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-[var(--bg-elevate)] border border-[var(--border)]">
    <span :class="['inline-block w-1.5 h-1.5 rounded-full', color]" />
    <span>{{ label }}</span>
  </div>
</template>
