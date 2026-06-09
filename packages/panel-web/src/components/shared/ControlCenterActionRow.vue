<script setup lang="ts">
import type { CommandPaletteIconKey } from '@/commands/icons';
import ControlCenterIcon from './ControlCenterIcon.vue';

defineProps<{
  icon: CommandPaletteIconKey;
  label: string;
  hint?: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  run: [];
  select: [];
}>();
</script>

<template>
  <li
    :data-cc-item="selected ? 'selected' : ''"
    class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors"
    :class="selected ? 'bg-[var(--brand-500)]/10' : 'hover:bg-[var(--bg-elevate)]'"
    @click="emit('run')"
    @mouseenter="emit('select')"
  >
    <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevate)] text-[var(--text-2)]">
      <ControlCenterIcon :icon="icon" class="h-4 w-4" />
    </span>
    <span class="text-sm flex-1 truncate">{{ label }}</span>
    <span v-if="hint" class="text-xs text-[var(--text-3)] font-mono">{{ hint }}</span>
  </li>
</template>
