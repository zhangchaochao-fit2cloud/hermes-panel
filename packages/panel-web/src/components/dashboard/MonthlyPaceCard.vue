<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { bffFetch } from '@/api/bff';
import { formatCompact as formatNumber } from '@/utils/format-number';

interface PaceData {
  month_start: string;
  days_elapsed: number;
  days_in_month: number;
  tokens_so_far: number;
  cost_so_far_usd: number;
  projected_tokens: number;
  projected_cost_usd: number;
}

const data = ref<PaceData | null>(null);
const loading = ref(false);
const error = ref(false);

const progress = computed(() => {
  if (!data.value) return 0;
  return Math.round((data.value.days_elapsed / data.value.days_in_month) * 100);
});

const monthLabel = computed(() => {
  if (!data.value) return '';
  const d = new Date(data.value.month_start);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    data.value = await bffFetch<PaceData>('/api/stats/pace');
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-5 shadow-[var(--shadow-1)]">
    <div class="flex items-baseline justify-between mb-3">
      <h3 class="text-sm font-semibold">月度配速</h3>
      <span class="text-xs text-[var(--text-3)]">{{ monthLabel }}</span>
    </div>

    <div v-if="loading || !data" class="h-[120px] flex items-center justify-center">
      <div class="text-sm text-[var(--text-3)]">加载中…</div>
    </div>

    <div v-else-if="error" class="h-[120px] flex items-center justify-center">
      <button class="text-sm text-[var(--brand-600)]" @click="load">重试</button>
    </div>

    <div v-else>
      <div class="flex items-baseline gap-2 mb-1">
        <span class="text-2xl font-bold tabular-nums">{{ formatNumber(data.tokens_so_far) }}</span>
        <span class="text-xs text-[var(--text-3)]">本月已用</span>
      </div>
      <div class="text-xs text-[var(--text-3)] mb-3">
        预计本月：<span class="font-medium text-[var(--text-1)]">{{ formatNumber(data.projected_tokens) }} tokens</span>
        <span v-if="data.projected_cost_usd > 0">· ~${{ data.projected_cost_usd.toFixed(2) }}</span>
      </div>

      <div class="relative h-2 rounded-full bg-[var(--bg-elevate)] overflow-hidden">
        <div
          class="absolute inset-y-0 left-0 bg-[var(--brand-500)] transition-all duration-500"
          :style="{ width: progress + '%' }"
        />
      </div>
      <div class="flex justify-between text-[11px] text-[var(--text-3)] mt-1.5">
        <span>第 {{ data.days_elapsed }} 天</span>
        <span>共 {{ data.days_in_month }} 天</span>
      </div>
    </div>
  </div>
</template>
