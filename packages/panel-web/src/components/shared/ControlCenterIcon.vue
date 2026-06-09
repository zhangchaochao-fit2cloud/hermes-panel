<script setup lang="ts">
import { COMMAND_PALETTE_ICON_PATHS, type CommandPaletteIconKey } from '@/commands/icons';

defineProps<{
  icon: CommandPaletteIconKey;
}>();
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="COMMAND_PALETTE_ICON_PATHS[icon]" />
  </svg>
</template>
