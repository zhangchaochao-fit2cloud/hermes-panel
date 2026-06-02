<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NTag, NProgress, NSpin, useMessage } from 'naive-ui';
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

const msg = useMessage();
const data = ref<CostOverview | null>(null);
const loading = ref(true);

onMounted(async () => {
  try { data.value = await bffFetch<CostOverview>('/api/cost/overview'); }
  catch { msg.error('加载成本数据失败'); }
  finally { loading.value = false; }
});

function statusType(s: string): 'success' | 'warning' | 'error' | 'default' {
  if (s === 'ok') return 'success';
  if (s === 'warning') return 'warning';
  if (s === 'exceeded') return 'error';
  return 'default';
}
</script>

<template>
  <div class="px-6 py-6 max-w-[1400px] mx-auto">
    <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">💰 成本管控</h2>
    <p class="text-sm text-[var(--text-3)] mb-6">统一管理多供应商成本，设置预算上限，自动告警</p>

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
          <div class="text-xs text-[var(--text-3)] mb-1">月度总预算</div>
          <div class="text-2xl font-bold text-[var(--text-1)]">${{ data.totalMonthlyBudget }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">已使用</div>
          <div class="text-2xl font-bold" :class="data.totalUsed > data.totalMonthlyBudget ? 'text-[var(--color-error)]' : 'text-[var(--text-1)]'">${{ data.totalUsed.toFixed(2) }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">剩余</div>
          <div class="text-2xl font-bold text-[var(--color-success)]">${{ data.totalRemaining.toFixed(2) }}</div>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div class="text-xs text-[var(--text-3)] mb-1">建议日均</div>
          <div class="text-2xl font-bold text-[var(--text-1)]">${{ data.dailyBudget.toFixed(2) }}</div>
        </div>
      </div>

      <!-- Overall progress -->
      <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="font-semibold text-[var(--text-1)]">总预算使用进度</span>
          <span :class="data.totalUsed > data.totalMonthlyBudget * 0.8 ? 'text-[var(--color-error)]' : 'text-[var(--text-2)]'">{{ (data.totalUsed / data.totalMonthlyBudget * 100).toFixed(1) }}%</span>
        </div>
        <NProgress :percentage="Math.min(100, data.totalUsed / data.totalMonthlyBudget * 100)" :height="12" :border-radius="6" :color="data.totalUsed > data.totalMonthlyBudget * 0.8 ? '#ef4444' : '#6366f1'" />
        <div v-if="data.projectedOverage > 0" class="text-xs text-[var(--color-error)] mt-2">⚠️ 按当前速率将超出预算 ${{ data.projectedOverage.toFixed(2) }}</div>
      </div>

      <!-- Providers -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div v-for="p in data.providers" :key="p.provider" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-[var(--text-1)] capitalize">{{ p.provider }}</h3>
            <NTag :type="statusType(p.status)" size="tiny">{{ p.status === 'ok' ? '正常' : p.status === 'warning' ? '警告' : p.status === 'exceeded' ? '超限' : '未知' }}</NTag>
          </div>
          <NProgress :percentage="Math.min(100, (p.currentUsage / p.hardLimit) * 100)" :height="8" :border-radius="4" :color="p.status === 'exceeded' ? '#ef4444' : p.status === 'warning' ? '#f59e0b' : '#6366f1'" />
          <div class="text-xs text-[var(--text-3)] mt-2">已用 ${{ p.currentUsage.toFixed(2) }} / ${{ p.hardLimit }} 限额 · 计费日: 每月 {{ p.billingCycleDay }} 号</div>
        </div>
      </div>

      <!-- Workspaces -->
      <div v-if="data.workspaces.length" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
        <h3 class="text-sm font-semibold text-[var(--text-1)] mb-4">项目预算</h3>
        <div class="space-y-4">
          <div v-for="w in data.workspaces" :key="w.workspaceId" class="flex items-center gap-4">
            <span class="text-sm text-[var(--text-2)] w-[160px]">{{ w.workspaceId }}</span>
            <div class="flex-1">
              <NProgress :percentage="Math.min(100, (w.currentUsage / w.monthlyBudget) * 100)" :height="6" :border-radius="3" :color="w.currentUsage > w.monthlyBudget ? '#ef4444' : '#6366f1'" :show-indicator="false" />
            </div>
            <span class="text-xs text-[var(--text-3)] w-[120px] text-right">${{ w.currentUsage.toFixed(2) }} / ${{ w.monthlyBudget }}</span>
            <NTag size="tiny">{{ w.exceedStrategy === 'warn' ? '仅警告' : w.exceedStrategy === 'downgrade' ? '自动降级' : '阻止' }}</NTag>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
