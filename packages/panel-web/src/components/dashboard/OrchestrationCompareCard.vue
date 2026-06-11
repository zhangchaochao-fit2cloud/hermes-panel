<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

const { t } = useI18n();

interface OrchestrationStats {
  totalOrchestrated: number;
  totalSingle: number;
  avgTokensOrchestrated: number;
  avgTokensSingle: number;
  avgMessagesOrchestrated: number;
  avgMessagesSingle: number;
  orchestrationSavingsPct: number;
}

const data = ref<OrchestrationStats | null>(null);
const loading = ref(false);
const error = ref(false);

const savingsLabel = computed(() => {
  if (!data.value) return '';
  const pct = data.value.orchestrationSavingsPct;
  if (pct > 0) return t('dashboard.orchestration.saved', { pct });
  if (pct < 0) return t('dashboard.orchestration.usedMore', { pct: Math.abs(pct) });
  return t('dashboard.orchestration.noDifference');
});

const savingsPositive = computed(() => (data.value?.orchestrationSavingsPct ?? 0) > 0);

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    data.value = await bffFetch<OrchestrationStats>('/api/stats/orchestration');
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
    <div class="flex items-baseline justify-between mb-4">
      <h3 class="text-sm font-semibold">{{ t('dashboard.orchestration.title') }}</h3>
      <span class="text-xs text-[var(--text-3)]">{{ t('dashboard.orchestration.subtitle') }}</span>
    </div>

    <div v-if="error" class="h-24 flex items-center justify-center">
      <button class="text-sm text-[var(--brand-600)]" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="loading" class="space-y-3">
      <ThemedSkeleton height="20px" />
      <ThemedSkeleton height="48px" />
    </div>

    <template v-else-if="data">
      <!-- Savings indicator -->
      <div
        class="mb-4 rounded-lg px-3 py-2 text-center text-sm font-medium"
        :class="savingsPositive
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        {{ savingsLabel }}
      </div>

      <!-- Side-by-side comparison -->
      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('dashboard.orchestration.orchestrated') }}</div>
          <div class="text-lg font-bold text-[var(--brand-500)]">{{ fmt(data.avgTokensOrchestrated) }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ t('dashboard.orchestration.avgTokens') }}</div>
          <div class="mt-2 text-sm font-medium">{{ data.avgMessagesOrchestrated }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ t('dashboard.orchestration.avgMessages') }}</div>
          <div class="mt-2 text-xs text-[var(--text-3)]">{{ data.totalOrchestrated }} {{ t('dashboard.orchestration.sessions') }}</div>
        </div>
        <div>
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('dashboard.orchestration.singleAgent') }}</div>
          <div class="text-lg font-bold text-[var(--text-2)]">{{ fmt(data.avgTokensSingle) }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ t('dashboard.orchestration.avgTokens') }}</div>
          <div class="mt-2 text-sm font-medium">{{ data.avgMessagesSingle }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ t('dashboard.orchestration.avgMessages') }}</div>
          <div class="mt-2 text-xs text-[var(--text-3)]">{{ data.totalSingle }} {{ t('dashboard.orchestration.sessions') }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
