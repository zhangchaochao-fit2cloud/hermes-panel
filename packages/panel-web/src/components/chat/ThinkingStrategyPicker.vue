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
  <div
    role="radiogroup"
    class="inline-flex items-center gap-0.5 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevate)] shadow-inner"
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
          class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs leading-none font-medium transition-all select-none"
          :class="value === chip.id
            ? 'bg-[var(--brand-500)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
            : 'text-[var(--text-2)] hover:bg-[var(--bg-card)] hover:text-[var(--text-1)]'"
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
