<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  used: number;
  limit: number;
  cost?: number;
}>();

const pct = computed(() => Math.min(100, (props.used / Math.max(1, props.limit)) * 100));
const stroke = computed(() => {
  if (pct.value >= 95) return '#ef4444';
  if (pct.value >= 80) return '#f97316';
  if (pct.value >= 50) return '#eab308';
  return '#10b981';
});
const r = 18;
const c = 2 * Math.PI * r;
const dashOffset = computed(() => c * (1 - pct.value / 100));

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
</script>

<template>
  <div class="relative inline-flex items-center justify-center w-12 h-12" :title="cost != null ? `~$${cost.toFixed(4)}` : ''">
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" :r="r" stroke="var(--border)" stroke-width="3" fill="none" />
      <circle
        cx="24" cy="24" :r="r"
        :stroke="stroke" stroke-width="3" fill="none"
        :stroke-dasharray="c"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        transform="rotate(-90 24 24)"
        style="transition: stroke-dashoffset 250ms var(--ease)"
      />
    </svg>
    <span class="absolute text-[10px] font-mono font-semibold">{{ fmt(used) }}</span>
  </div>
</template>
