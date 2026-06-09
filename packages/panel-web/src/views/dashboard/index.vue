<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useOsTheme, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { HealthStatus, SessionSummary } from '@hermes-panel/shared';
import { useSystemStore } from '@/stores/system';
import { bffFetch, BffApiError } from '@/api/bff';
import WelcomeHeader from '@/components/dashboard/WelcomeHeader.vue';
import StatCard from '@/components/dashboard/StatCard.vue';
import UsageChart, { type DailyTokenPoint } from '@/components/dashboard/UsageChart.vue';
import ModelPieChart, { type ModelStatPoint } from '@/components/dashboard/ModelPieChart.vue';
import RecentSessions from '@/components/dashboard/RecentSessions.vue';
import CacheCard from '@/components/dashboard/CacheCard.vue';
import MonthlyPaceCard from '@/components/dashboard/MonthlyPaceCard.vue';
import UsageCard from '@/components/dashboard/UsageCard.vue';
import CostIntelligenceCard from '@/components/dashboard/CostIntelligenceCard.vue';
import SystemHealthCard from '@/components/dashboard/SystemHealthCard.vue';
import ToolUsageCard from '@/components/dashboard/ToolUsageCard.vue';
import OrchestrationCompareCard from '@/components/dashboard/OrchestrationCompareCard.vue';
import CapabilityMap from '@/components/dashboard/CapabilityMap.vue';
import DashboardQuickStart from '@/components/dashboard/DashboardQuickStart.vue';
import { useCronStore } from '@/stores/cron';
import { aggregateCronSessions } from '@/utils/aggregate-cron-sessions';

interface OverallStats {
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  today_tokens: number;
  today_cost_usd: number;
}

const { t } = useI18n();
const system = useSystemStore();
const { health, loading: healthLoading } = storeToRefs(system);
const osTheme = useOsTheme();
const message = useMessage();

const dark = computed(() => osTheme.value === 'dark');

const overall = ref<OverallStats>({
  total_sessions: 0,
  total_messages: 0,
  total_tokens: 0,
  today_tokens: 0,
  today_cost_usd: 0,
});
const daily = ref<DailyTokenPoint[]>([]);
const models = ref<ModelStatPoint[]>([]);
const sessions = ref<SessionSummary[]>([]);

const overallLoading = ref(true);
const dailyLoading = ref(true);
const modelsLoading = ref(true);
const sessionsLoading = ref(true);

function reportError(scope: string, err: unknown): void {
  const msg = err instanceof BffApiError ? err.message : (err as Error)?.message ?? String(err);
  console.error(`[dashboard:${scope}]`, err);
  message.error(`${scope}: ${msg}`, { duration: 5000, closable: true });
}

async function loadOverall(): Promise<void> {
  overallLoading.value = true;
  try {
    overall.value = await bffFetch<OverallStats>('/api/stats/overall');
  } catch (err) {
    reportError('overall', err);
  } finally {
    overallLoading.value = false;
  }
}

async function loadDaily(): Promise<void> {
  dailyLoading.value = true;
  try {
    daily.value = await bffFetch<DailyTokenPoint[]>('/api/stats/daily?days=7');
  } catch (err) {
    reportError('daily', err);
  } finally {
    dailyLoading.value = false;
  }
}

async function loadModels(): Promise<void> {
  modelsLoading.value = true;
  try {
    models.value = await bffFetch<ModelStatPoint[]>('/api/stats/models?days=30');
  } catch (err) {
    reportError('models', err);
  } finally {
    modelsLoading.value = false;
  }
}

const cronStore = useCronStore();

async function loadSessions(): Promise<void> {
  sessionsLoading.value = true;
  try {
    // 多拉一些原始 session 让聚合后还剩 ≥5；同时拉 cron jobs 拿真名
    const [raw] = await Promise.all([
      bffFetch<SessionSummary[]>('/api/sessions?limit=30'),
      cronStore.jobs.length === 0 ? cronStore.load({ initial: true }) : Promise.resolve(),
    ]);
    const jobNames = {
      get: (id: string) => cronStore.jobs.find(j => j.id === id)?.name,
    };
    sessions.value = aggregateCronSessions(raw, jobNames).slice(0, 5);
  } catch (err) {
    reportError('sessions', err);
  } finally {
    sessionsLoading.value = false;
  }
}

async function refreshHealth(): Promise<void> {
  if (!health.value) await system.refresh();
}

onMounted(() => {
  void refreshHealth();
  void loadOverall();
  void loadDaily();
  void loadModels();
  void loadSessions();
});

// Provide the typed health value to the welcome header
const healthTyped = computed<HealthStatus | null>(() => health.value ?? null);

const todayUsdLabel = computed(() => {
  const v = overall.value.today_cost_usd;
  if (!Number.isFinite(v) || v <= 0) return '';
  return `${t('dashboard.stats.todayCostPrefix')} $${v.toFixed(2)}`;
});
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
      <WelcomeHeader :health="healthTyped" :loading="healthLoading" />

      <DashboardQuickStart :health="healthTyped" :loading="healthLoading" />

      <CapabilityMap />

      <!-- Stat cards: 2x2 on mobile (avoid 4 ultra-thin columns), 4x1 from md up. -->
      <section class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          :label="t('dashboard.stats.totalSessions')"
          :value="overall.total_sessions"
          :loading="overallLoading"
          accent="#6366f1"
        />
        <StatCard
          :label="t('dashboard.stats.todayTokens')"
          :value="overall.today_tokens"
          :loading="overallLoading"
          :trend="todayUsdLabel"
          accent="#22d3ee"
        />
        <StatCard
          :label="t('dashboard.stats.totalTokens')"
          :value="overall.total_tokens"
          :loading="overallLoading"
          accent="#a78bfa"
        />
        <StatCard
          :label="t('dashboard.stats.totalMessages')"
          :value="overall.total_messages"
          :loading="overallLoading"
          accent="#34d399"
        />
      </section>

      <!-- Persistent usage ledger (today / this month / all time) -->
      <UsageCard />

      <!-- Cost intelligence (proactive savings suggestions) -->
      <CostIntelligenceCard />

      <!-- Token optimization row (spec §11) + at-a-glance system health -->
      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CacheCard />
        <MonthlyPaceCard />
        <SystemHealthCard />
      </section>

      <!-- Charts: 2:1 on lg, stacked on md -->
      <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <UsageChart :data="daily" :dark="dark" :loading="dailyLoading" />
        </div>
        <div class="lg:col-span-1">
          <ModelPieChart :data="models" :dark="dark" :loading="modelsLoading" />
        </div>
      </section>

      <!-- Tool usage heatmap -->
      <ToolUsageCard />

      <!-- Orchestration comparison -->
      <OrchestrationCompareCard />

      <!-- Recent sessions -->
      <RecentSessions :sessions="sessions" :loading="sessionsLoading" />
    </div>
  </div>
</template>
