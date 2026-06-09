<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useOsTheme, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { HealthStatus, SessionSummary } from '@hermes-panel/shared';
import { useSystemStore } from '@/stores/system';
import { bffFetch, BffApiError } from '@/api/bff';
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
import DashboardWorkbenchHub from '@/components/dashboard/DashboardWorkbenchHub.vue';
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
const showSetupPath = computed(() => healthLoading.value || !healthTyped.value?.hermes.running);

const todayUsdLabel = computed(() => {
  const v = overall.value.today_cost_usd;
  if (!Number.isFinite(v) || v <= 0) return '';
  return `${t('dashboard.stats.todayCostPrefix')} $${v.toFixed(2)}`;
});
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="dashboard-shell mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-4 sm:gap-7 sm:px-6 sm:py-6">
      <DashboardWorkbenchHub :health="healthTyped" :loading="healthLoading" />

      <DashboardQuickStart v-if="showSetupPath" :health="healthTyped" :loading="healthLoading" />

      <section class="dashboard-section" aria-labelledby="dashboard-operations-title">
        <header class="dashboard-section-header">
          <p class="dashboard-section-kicker">{{ t('dashboard.sections.operations.eyebrow') }}</p>
          <h2 id="dashboard-operations-title" class="dashboard-section-title">
            {{ t('dashboard.sections.operations.title') }}
          </h2>
          <p class="dashboard-section-desc">
            {{ t('dashboard.sections.operations.desc') }}
          </p>
        </header>

        <!-- Stat cards: 2x2 on mobile (avoid 4 ultra-thin columns), 4x1 from md up. -->
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        </div>

        <div class="dashboard-operations-grid">
          <UsageCard />
          <CostIntelligenceCard />
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CacheCard />
          <MonthlyPaceCard />
          <SystemHealthCard />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <UsageChart :data="daily" :dark="dark" :loading="dailyLoading" />
          </div>
          <div class="lg:col-span-1">
            <ModelPieChart :data="models" :dark="dark" :loading="modelsLoading" />
          </div>
        </div>

        <ToolUsageCard />
      </section>

      <section class="dashboard-section" aria-labelledby="dashboard-capabilities-title">
        <header class="dashboard-section-header">
          <p class="dashboard-section-kicker">{{ t('dashboard.sections.capabilities.eyebrow') }}</p>
          <h2 id="dashboard-capabilities-title" class="dashboard-section-title">
            {{ t('dashboard.sections.capabilities.title') }}
          </h2>
          <p class="dashboard-section-desc">
            {{ t('dashboard.sections.capabilities.desc') }}
          </p>
        </header>
        <OrchestrationCompareCard />
        <CapabilityMap />
      </section>

      <section class="dashboard-section" aria-labelledby="dashboard-history-title">
        <header class="dashboard-section-header">
          <p class="dashboard-section-kicker">{{ t('dashboard.sections.history.eyebrow') }}</p>
          <h2 id="dashboard-history-title" class="dashboard-section-title">
            {{ t('dashboard.sections.history.title') }}
          </h2>
          <p class="dashboard-section-desc">
            {{ t('dashboard.sections.history.desc') }}
          </p>
        </header>
        <RecentSessions :sessions="sessions" :loading="sessionsLoading" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-shell {
  contain: layout style;
}

.dashboard-section {
  display: grid;
  gap: 16px;
}

.dashboard-section-header {
  max-width: 760px;
}

.dashboard-section-kicker {
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
}

.dashboard-section-title {
  margin-top: 4px;
  color: var(--text-1);
  font-size: 20px;
  font-weight: 760;
  line-height: 1.25;
}

.dashboard-section-desc {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}

.dashboard-operations-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 1024px) {
  .dashboard-operations-grid {
    grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  }
}
</style>
