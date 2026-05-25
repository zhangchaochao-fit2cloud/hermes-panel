<script setup lang="ts">
import { computed, toRef } from 'vue';
import { formatCompact } from '@/utils/format-number';
import { useCountingAnimation } from '@/utils/counting-animation';

const props = defineProps<{
  label: string;
  value: number;
  /** Optional prefix (eg "$"). Rendered before the formatted number. */
  prefix?: string;
  /** Optional suffix (eg "tok"). Rendered after the formatted number. */
  suffix?: string;
  /** Optional trend hint shown below the number — e.g. "+3 today". */
  trend?: string;
  /** Optional semantic tone for the trend chip. */
  trendTone?: 'up' | 'down' | 'flat';
  /** Optional accent color expression — defaults to brand. */
  accent?: string;
  loading?: boolean;
}>();

const target = toRef(props, 'value');
const animated = useCountingAnimation(target);

const display = computed(() => formatCompact(Math.round(animated.value)));

const trendClass = computed(() => {
  switch (props.trendTone) {
    case 'up':   return 'text-emerald-500';
    case 'down': return 'text-rose-500';
    default:     return 'text-[var(--text-3)]';
  }
});
</script>

<template>
  <div
    class="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
  >
    <div class="flex items-center justify-between">
      <div class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
        {{ label }}
      </div>
      <div
        class="h-2 w-2 rounded-full"
        :style="{ background: accent ?? 'var(--brand-500)' }"
      />
    </div>

    <div class="mt-3 flex items-baseline gap-1">
      <span v-if="prefix" class="text-base text-[var(--text-2)]">{{ prefix }}</span>
      <span class="text-3xl font-semibold tabular-nums">
        <template v-if="loading">—</template>
        <template v-else>{{ display }}</template>
      </span>
      <span v-if="suffix" class="text-xs text-[var(--text-3)]">{{ suffix }}</span>
    </div>

    <div v-if="trend" class="mt-2 text-xs" :class="trendClass">
      {{ trend }}
    </div>
    <div v-else class="mt-2 text-xs text-[var(--text-3)] opacity-0 select-none">·</div>
  </div>
</template>
