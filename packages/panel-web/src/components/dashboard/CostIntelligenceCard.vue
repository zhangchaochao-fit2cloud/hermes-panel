<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

const { t } = useI18n();

interface CostSuggestion {
  id: string; type: string; title: string; description: string;
  estimatedSavingsUsd: number; estimatedSavingsPct: number;
  currentModel: string; suggestedModel: string; affectedRuns: number; confidence: number;
}

interface CostData {
  breakdown: { byModel: Record<string, { runs: number; cost: number; pct: number }>; totalCost: number; projectedMonthly: number; dailyAvg: number };
  suggestions: CostSuggestion[];
  monthlyBudget: number; monthlyUsed: number; monthlyRemaining: number;
  dailyRate: number; willExceedBudget: boolean;
}

const data = ref<CostData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    data.value = await bffFetch<CostData>('/api/usage/intelligence', { silent: true });
  } catch (err) {
    data.value = null;
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function pctClass(pct: number): string {
  if (pct > 80) return 'text-[var(--color-error)]';
  if (pct > 60) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-success)]';
}
</script>

<template>
  <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
    <h3 class="text-sm font-semibold text-[var(--text-1)] mb-4">{{ t('dashboard.costIntelligence.title') }}</h3>

    <ThemedSkeleton v-if="loading" height="160px" />
    <div v-else-if="error" class="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-4">
      <p class="text-sm font-medium text-[var(--text-2)]">{{ t('dashboard.costIntelligence.unavailable') }}</p>
      <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">{{ error }}</p>
      <button class="mt-3 text-xs font-medium text-[var(--brand-600)] hover:underline" type="button" @click="load">
        {{ t('common.retry') }}
      </button>
    </div>
    <template v-else-if="data">
      <!-- Budget bar -->
      <div class="mb-4">
        <div class="flex justify-between text-xs mb-1">
          <span class="text-[var(--text-3)]">{{ t('dashboard.costIntelligence.monthlyUsed') }}</span>
          <span :class="['font-semibold', pctClass((data.monthlyUsed / data.monthlyBudget) * 100)]">
            ${{ data.monthlyUsed.toFixed(2) }} / ${{ data.monthlyBudget }}
          </span>
        </div>
        <div class="h-2 rounded-full bg-[var(--bg-elevate)] overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="(data.monthlyUsed / data.monthlyBudget) > 0.8 ? 'bg-[var(--color-error)]' : 'bg-[var(--brand-500)]'"
            :style="{ width: `${Math.min(100, (data.monthlyUsed / data.monthlyBudget) * 100)}%` }"
          />
        </div>
        <div class="text-[10px] text-[var(--text-3)] mt-1">
          {{ t('dashboard.costIntelligence.dailyAvg', { amount: data.dailyRate.toFixed(2) }) }} · {{ t('dashboard.costIntelligence.projected', { amount: data.breakdown.projectedMonthly.toFixed(2) }) }}
          <span v-if="data.willExceedBudget" class="text-[var(--color-error)] font-semibold">{{ t('dashboard.costIntelligence.willExceed') }}</span>
        </div>
      </div>

      <!-- Top model by cost -->
      <div v-if="Object.keys(data.breakdown.byModel).length" class="mb-3">
        <div
          v-for="entry in Object.entries(data.breakdown.byModel).slice(0, 3)"
          :key="entry[0]"
          class="flex items-center justify-between text-xs py-1"
        >
          <span class="text-[var(--text-2)]">{{ entry[0] }}</span>
          <span class="font-mono text-[var(--text-2)]">${{ entry[1].cost.toFixed(2) }} ({{ entry[1].pct }}%)</span>
        </div>
      </div>

      <!-- Suggestions -->
      <div v-if="data.suggestions.length" class="border-t border-[var(--border)] pt-3">
        <p class="text-xs font-semibold text-[var(--brand-600)] mb-2">
          {{ t('dashboard.costIntelligence.canSave', { amount: data.suggestions.reduce((s, x) => s + x.estimatedSavingsUsd, 0).toFixed(2) }) }}
        </p>
        <div v-for="s in data.suggestions.slice(0, 2)" :key="s.id" class="text-xs text-[var(--text-3)] mb-1">
          {{ s.title }} — {{ t('dashboard.costIntelligence.savePer', { amount: s.estimatedSavingsUsd, pct: s.estimatedSavingsPct }) }}
        </div>
      </div>
    </template>
  </div>
</template>
