<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NTag, NProgress, NSpin, NButton, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';

interface ProviderLimit {
  provider: string; hardLimit: number; softLimit: number; currentUsage: number;
  billingCycleDay: number; status: 'ok' | 'warning' | 'exceeded' | 'unknown';
}
interface WorkspaceBudget {
  workspaceId: string; monthlyBudget: number; currentUsage: number;
  exceedStrategy: string; alertThreshold: number; roleQuotas: Record<string, { maxMonthlyCost: number }>;
}
interface CostOverview {
  providers: ProviderLimit[]; workspaces: WorkspaceBudget[];
  totalMonthlyBudget: number; totalUsed: number; totalRemaining: number;
  dailyBudget: number; projectedOverage: number;
  alerts: Array<{ level: string; message: string; source: string; timestamp: number }>;
}
interface Optimization {
  id: string; type: string; title: string; description: string;
  estimatedSavingsUsd: number; estimatedSavingsPct: number;
  currentModel: string; suggestedModel: string; affectedRuns: number; confidence: number;
}

const msg = useMessage();
const { t } = useI18n();
const data = ref<CostOverview | null>(null);
const loading = ref(true);
const syncing = ref(false);
const optimizations = ref<Optimization[]>([]);

onMounted(async () => {
  try { data.value = await bffFetch<CostOverview>('/api/cost/overview'); }
  catch { msg.error(t('cost.loadFailed')); }
  finally { loading.value = false; }
});

async function syncBilling() {
  syncing.value = true;
  try {
    const res = await bffFetch<{ synced: number }>('/api/cost/sync', { method: 'POST' });
    msg.success(t('cost.syncSuccess', { count: res.synced }));
    await loadOptimizations();
  } catch { msg.error(t('cost.syncFailed')); }
  finally { syncing.value = false; }
}

async function loadOptimizations() {
  try {
    const res = await bffFetch<{ optimizations: Optimization[] }>('/api/cost/optimizations');
    optimizations.value = res.optimizations;
  } catch { /* silent */ }
}

function statusType(s: string): 'success' | 'warning' | 'error' | 'default' {
  if (s === 'ok') return 'success';
  if (s === 'warning') return 'warning';
  if (s === 'exceeded') return 'error';
  return 'default';
}

function confidenceType(pct: number): 'success' | 'warning' | 'default' {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'default';
}
</script>

<template>
  <div class="px-6 py-6 max-w-[1400px] mx-auto">
    <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('cost.title') }}</h2>
    <p class="text-sm text-[var(--text-3)] mb-6">{{ t('cost.subtitle') }}</p>

    <NSpin v-if="loading" size="small" class="flex justify-center py-20" />
    <template v-else-if="data">
      <!-- Alerts -->
      <div v-if="data.alerts.length" class="mb-6 space-y-2">
        <div v-for="a in data.alerts" :key="`${a.source}-${a.timestamp}`"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
          :class="a.level === 'critical' ? 'bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] text-[var(--color-error)]' : 'bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] text-[var(--color-warning)]'"
        >{{ a.level === 'critical' ? '🚨' : '⚠️' }} {{ a.message }}</div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('cost.totalBudget') }}</div>
          <div class="text-2xl font-bold text-[var(--text-1)]">${{ data.totalMonthlyBudget }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('cost.used') }}</div>
          <div class="text-2xl font-bold" :class="data.totalUsed > data.totalMonthlyBudget ? 'text-[var(--color-error)]' : 'text-[var(--text-1)]'">${{ data.totalUsed.toFixed(2) }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('cost.remaining') }}</div>
          <div class="text-2xl font-bold text-[var(--color-success)]">${{ data.totalRemaining.toFixed(2) }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">{{ t('cost.dailySuggested') }}</div>
          <div class="text-2xl font-bold text-[var(--text-1)]">${{ data.dailyBudget.toFixed(2) }}</div>
        </div>
      </div>

      <!-- Overall progress -->
      <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="font-semibold text-[var(--text-1)]">{{ t('cost.overallProgress') }}</span>
          <span :class="data.totalUsed > data.totalMonthlyBudget * 0.8 ? 'text-[var(--color-error)]' : 'text-[var(--text-2)]'">{{ (data.totalUsed / data.totalMonthlyBudget * 100).toFixed(1) }}%</span>
        </div>
        <NProgress :percentage="Math.min(100, data.totalUsed / data.totalMonthlyBudget * 100)" :height="12" :border-radius="6" :color="data.totalUsed > data.totalMonthlyBudget * 0.8 ? '#ef4444' : '#6366f1'" />
        <div v-if="data.projectedOverage > 0" class="text-xs text-[var(--color-error)] mt-2">{{ t('cost.projectedOverage', { amount: data.projectedOverage.toFixed(2) }) }}</div>
      </div>

      <!-- Providers -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div v-for="p in data.providers" :key="p.provider" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-[var(--text-1)] capitalize">{{ p.provider }}</h3>
            <NTag :type="statusType(p.status)" size="tiny">{{ p.status === 'ok' ? t('cost.statusOk') : p.status === 'warning' ? t('cost.statusWarning') : p.status === 'exceeded' ? t('cost.statusExceeded') : t('cost.statusUnknown') }}</NTag>
          </div>
          <NProgress :percentage="Math.min(100, (p.currentUsage / p.hardLimit) * 100)" :height="8" :border-radius="4" :color="p.status === 'exceeded' ? '#ef4444' : p.status === 'warning' ? '#f59e0b' : '#6366f1'" />
          <div class="text-xs text-[var(--text-3)] mt-2">{{ t('cost.providerUsage', { used: p.currentUsage.toFixed(2), limit: p.hardLimit, day: p.billingCycleDay }) }}</div>
        </div>
      </div>

      <!-- Workspaces -->
      <div v-if="data.workspaces.length" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-6">
        <h3 class="text-sm font-semibold text-[var(--text-1)] mb-4">{{ t('cost.workspaceBudget') }}</h3>
        <div class="space-y-4">
          <div v-for="w in data.workspaces" :key="w.workspaceId" class="flex items-center gap-4">
            <span class="text-sm text-[var(--text-2)] w-[160px]">{{ w.workspaceId }}</span>
            <div class="flex-1">
              <NProgress :percentage="Math.min(100, (w.currentUsage / w.monthlyBudget) * 100)" :height="6" :border-radius="3" :color="w.currentUsage > w.monthlyBudget ? '#ef4444' : '#6366f1'" :show-indicator="false" />
            </div>
            <span class="text-xs text-[var(--text-3)] w-[120px] text-right">${{ w.currentUsage.toFixed(2) }} / ${{ w.monthlyBudget }}</span>
            <NTag size="tiny">{{ w.exceedStrategy === 'warn' ? t('cost.strategyWarn') : w.exceedStrategy === 'downgrade' ? t('cost.strategyDowngrade') : t('cost.strategyBlock') }}</NTag>
          </div>
        </div>
      </div>

      <!-- Sync billing toolbar -->
      <div class="flex items-center gap-3 mb-6">
        <NButton :loading="syncing" :disabled="syncing" size="small" type="primary" @click="syncBilling">
          {{ syncing ? t('cost.syncing') : t('cost.syncBtn') }}
        </NButton>
      </div>

      <!-- Optimization suggestions -->
      <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
        <h3 class="text-sm font-semibold text-[var(--text-1)] mb-4">💡 {{ t('cost.optimizations') }}</h3>
        <div v-if="!optimizations.length" class="text-sm text-[var(--text-3)]">{{ t('cost.noOptimizations') }}</div>
        <div v-else class="space-y-4">
          <div v-for="opt in optimizations" :key="opt.id" class="rounded-lg border border-[var(--border)] p-4">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <div class="text-sm font-semibold text-[var(--text-1)]">{{ opt.title }}</div>
                <div class="text-xs text-[var(--text-3)] mt-0.5">{{ opt.description }}</div>
              </div>
              <NTag :type="confidenceType(opt.confidence)" size="tiny">{{ t('cost.confidence', { pct: opt.confidence }) }}</NTag>
            </div>
            <div class="flex items-center gap-2 text-xs text-[var(--text-2)] mt-2">
              <span class="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--text-3)_10%,transparent)]">{{ t('cost.currentModel') }}: {{ opt.currentModel }}</span>
              <span>→</span>
              <span class="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]">{{ t('cost.suggestedModel') }}: {{ opt.suggestedModel }}</span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs">
              <span class="text-[var(--color-success)] font-medium">{{ t('cost.savings', { amount: opt.estimatedSavingsUsd.toFixed(2), pct: opt.estimatedSavingsPct }) }}</span>
              <span class="text-[var(--text-3)]">{{ t('cost.affectedRuns', { count: opt.affectedRuns }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
