<script setup lang="ts">
import { computed } from 'vue';
import { NTooltip } from 'naive-ui';
import { useI18n } from 'vue-i18n';

type Strategy = 'fast' | 'auto' | 'extended';

const props = defineProps<{
  value: Strategy;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', v: Strategy): void;
}>();

const { t } = useI18n();

interface ChipDef {
  id: Strategy;
  icon: string;
  labelKey: string;
  hintKey: string;
}

const chips = computed<ChipDef[]>(() => [
  { id: 'fast', icon: '⚡', labelKey: 'chat.composer.speed.fast', hintKey: 'chat.composer.speed.fastHint' },
  { id: 'auto', icon: '🤖', labelKey: 'chat.composer.speed.auto', hintKey: 'chat.composer.speed.autoHint' },
  { id: 'extended', icon: '🧠', labelKey: 'chat.composer.speed.extended', hintKey: 'chat.composer.speed.extendedHint' },
]);

function select(id: Strategy): void {
  if (props.disabled) return;
  if (id === props.value) return;
  emit('update:value', id);
}
</script>

<template>
  <!--
    Codex-style strategy picker: no outer frame at all. Each chip is a
    transparent text-style button by default, lifts to bg-elevate on
    hover, locks to a slightly darker bg-elevate when active. Cleaner
    next to the composer where every other tool button follows the
    same "transparent → hover bg → active bg" pattern.
  -->
  <div
    role="radiogroup"
    class="strategy-picker inline-flex items-center gap-0.5"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
  >
    <NTooltip
      v-for="chip in chips"
      :key="chip.id"
      trigger="hover"
      :delay="300"
    >
      <template #trigger>
        <button
          type="button"
          role="radio"
          :aria-checked="value === chip.id"
          :disabled="disabled"
          class="strategy-chip cursor-pointer inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs leading-none font-medium select-none transition-colors duration-150"
          :class="value === chip.id ? 'is-active' : ''"
          @click="select(chip.id)"
        >
          <span aria-hidden="true" class="text-sm leading-none">{{ chip.icon }}</span>
          <span>{{ t(chip.labelKey) }}</span>
        </button>
      </template>
      <div class="max-w-[220px] text-xs leading-relaxed">
        <div class="font-medium mb-0.5">{{ chip.icon }} {{ t(chip.labelKey) }}</div>
        <div class="opacity-90">{{ t(chip.hintKey) }}</div>
      </div>
    </NTooltip>
  </div>
</template>

<style scoped>
.strategy-chip {
  color: var(--text-2);
  background: transparent;
}
.strategy-chip:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.strategy-chip.is-active {
  background: color-mix(in srgb, var(--text-1) 8%, var(--bg-card));
  color: var(--text-1);
}
</style>
