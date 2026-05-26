<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import { formatCompact as formatNumber } from '@/utils/format-number';

const { t } = useI18n();

interface CacheStats {
  total_input_tokens: number;
  total_cache_read_tokens: number;
  total_cache_write_tokens: number;
  cache_hit_ratio: number;
  estimated_saved_usd: number;
}

const data = ref<CacheStats | null>(null);
const loading = ref(false);
const error = ref(false);

const pct = computed(() => data.value ? Math.round(data.value.cache_hit_ratio * 100) : 0);
const color = computed(() => {
  if (pct.value >= 70) return '#10b981';
  if (pct.value >= 40) return '#eab308';
  return '#a1a1aa';
});

const ringDash = computed(() => {
  // SVG circle perimeter ≈ 2 * π * r, r = 30 → 188.5
  const c = 2 * Math.PI * 30;
  const offset = c * (1 - pct.value / 100);
  return { c, offset };
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    data.value = await bffFetch<CacheStats>('/api/stats/cache?days=30');
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
      <h3 class="text-sm font-semibold">{{ t('dashboard.cache.title') }}</h3>
      <span class="text-xs text-[var(--text-3)]">{{ t('dashboard.cache.windowLabel') }}</span>
    </div>

    <div v-if="loading || !data" class="h-[120px] flex items-center justify-center">
      <div class="text-sm text-[var(--text-3)]">{{ t('common.loading') }}</div>
    </div>

    <div v-else-if="error" class="h-[120px] flex items-center justify-center">
      <button class="text-sm text-[var(--brand-600)]" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else class="flex items-center gap-4">
      <div class="relative w-[88px] h-[88px] shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="30" stroke="var(--border)" stroke-width="6" fill="none" />
          <circle
            cx="44" cy="44" r="30"
            :stroke="color" stroke-width="6" fill="none"
            :stroke-dasharray="ringDash.c"
            :stroke-dashoffset="ringDash.offset"
            stroke-linecap="round"
            transform="rotate(-90 44 44)"
            style="transition: stroke-dashoffset 600ms cubic-bezier(.4,0,.2,1)"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center text-xl font-bold">
          {{ pct }}%
        </div>
      </div>

      <div class="flex-1 min-w-0 text-xs space-y-1.5">
        <div class="flex justify-between gap-2">
          <span class="text-[var(--text-3)]">{{ t('dashboard.cache.hits') }}</span>
          <span class="font-mono">{{ formatNumber(data.total_cache_read_tokens) }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-[var(--text-3)]">{{ t('dashboard.cache.writes') }}</span>
          <span class="font-mono">{{ formatNumber(data.total_cache_write_tokens) }}</span>
        </div>
        <div class="flex justify-between gap-2 pt-1 border-t border-[var(--border)]">
          <span class="text-[var(--text-3)]">{{ t('dashboard.cache.saved') }}</span>
          <span class="font-mono text-green-600">${{ data.estimated_saved_usd.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
