<script setup lang="ts">
import { NTooltip } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useExecutionMode, type ExecutionMode } from '@/composables/useExecutionMode';

const { t } = useI18n();
const { mode, setMode } = useExecutionMode();

const modes: Array<{ id: ExecutionMode; icon: string; labelKey: string; hintKey: string }> = [
  { id: 'suggest', icon: '🛡️', labelKey: 'chat.executionMode.suggest.label', hintKey: 'chat.executionMode.suggest.hint' },
  { id: 'auto-edit', icon: '✏️', labelKey: 'chat.executionMode.autoEdit.label', hintKey: 'chat.executionMode.autoEdit.hint' },
  { id: 'full-auto', icon: '⚡', labelKey: 'chat.executionMode.fullAuto.label', hintKey: 'chat.executionMode.fullAuto.hint' },
];
</script>

<template>
  <div class="execution-mode-picker inline-flex items-center gap-0.5" role="radiogroup" :aria-label="t('chat.executionMode.title')">
    <NTooltip v-for="m in modes" :key="m.id" trigger="hover" :delay="300">
      <template #trigger>
        <button
          type="button"
          role="radio"
          :aria-checked="mode === m.id"
          :aria-label="`${t(m.labelKey)} - ${t(m.hintKey)}`"
          class="mode-chip cursor-pointer inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium select-none transition-colors"
          :class="mode === m.id ? 'is-active' : ''"
          @click="setMode(m.id)"
        >
          <span class="text-sm">{{ m.icon }}</span>
          <span class="hidden sm:inline">{{ t(m.labelKey) }}</span>
        </button>
      </template>
      <div class="max-w-[200px] text-xs">
        <div class="font-medium mb-0.5">{{ m.icon }} {{ t(m.labelKey) }}</div>
        <div class="opacity-90">{{ t(m.hintKey) }}</div>
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
