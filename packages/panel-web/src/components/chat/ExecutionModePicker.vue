<script setup lang="ts">
import { NTooltip } from 'naive-ui';
import { useExecutionMode, type ExecutionMode } from '@/composables/useExecutionMode';

const { mode, setMode } = useExecutionMode();

const modes: Array<{ id: ExecutionMode; icon: string; label: string; hint: string }> = [
  { id: 'suggest', icon: '🛡️', label: 'Suggest', hint: 'AI explains actions before executing — safest mode' },
  { id: 'auto-edit', icon: '✏️', label: 'Auto Edit', hint: 'AI can read/write files freely, commands need approval' },
  { id: 'full-auto', icon: '⚡', label: 'Full Auto', hint: 'AI handles everything autonomously — fastest but least oversight' },
];
</script>

<template>
  <div class="execution-mode-picker inline-flex items-center gap-0.5" role="radiogroup">
    <NTooltip v-for="m in modes" :key="m.id" trigger="hover" :delay="300">
      <template #trigger>
        <button
          type="button"
          role="radio"
          :aria-checked="mode === m.id"
          class="mode-chip cursor-pointer inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium select-none transition-colors"
          :class="mode === m.id ? 'is-active' : ''"
          @click="setMode(m.id)"
        >
          <span class="text-sm">{{ m.icon }}</span>
          <span class="hidden sm:inline">{{ m.label }}</span>
        </button>
      </template>
      <div class="max-w-[200px] text-xs">
        <div class="font-medium mb-0.5">{{ m.icon }} {{ m.label }}</div>
        <div class="opacity-90">{{ m.hint }}</div>
      </div>
    </NTooltip>
  </div>
</template>

<style scoped>
.mode-chip {
  color: var(--text-2);
  background: transparent;
}
.mode-chip:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.mode-chip.is-active {
  background: color-mix(in srgb, var(--text-1) 8%, var(--bg-card));
  color: var(--text-1);
}
</style>
