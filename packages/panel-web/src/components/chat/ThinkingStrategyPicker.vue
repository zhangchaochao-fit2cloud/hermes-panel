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
    class="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)]"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
  >
    <NTooltip
      v-for="chip in chips"
      :key="chip.id"
      trigger="hover"
      :delay="200"
    >
      <template #trigger>
        <button
          type="button"
          role="radio"
          :aria-checked="value === chip.id"
          :disabled="disabled"
          class="inline-flex items-center gap-1 h-6 px-2 rounded text-xs leading-none transition-colors select-none"
          :class="value === chip.id
            ? 'bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]'
            : 'text-[var(--text-2)] hover:bg-[var(--bg-card)] hover:text-[var(--text-1)]'"
          @click="select(chip.id)"
        >
          <span aria-hidden="true">{{ chip.icon }}</span>
          <span>{{ t(chip.labelKey) }}</span>
        </button>
      </template>
      {{ t(chip.hintKey) }}
    </NTooltip>
  </div>
</template>
