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
    class="strategy-picker inline-flex items-center p-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
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
          class="strategy-chip cursor-pointer inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs leading-none font-medium select-none transition-all duration-150"
          :class="value === chip.id
            ? 'is-active text-white shadow-[0_1px_4px_rgba(0,0,0,0.18)]'
            : 'text-[var(--text-2)] hover:text-[var(--text-1)]'"
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
/* Active chip uses a brand gradient so the pill feels lit rather than
 * just colored. Hover on inactive chips lifts the bg slightly so the
 * affordance is clear without being noisy. */
.strategy-chip.is-active {
  background: linear-gradient(135deg, var(--brand-500), var(--brand-600));
}
.strategy-chip:not(.is-active):hover {
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
}
</style>
