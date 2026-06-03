<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NTag, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import EmptyState from '@/components/shared/EmptyState.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import { useI18n } from 'vue-i18n';

interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  resource: string;
  outcome: 'success' | 'failure' | 'denied' | string;
  ip: string;
  details?: string;
}

interface AuditStats {
  total: number;
  last24h: number;
  denied: number;
  topActions: Array<{ action: string; count: number }>;
}

const msg = useMessage();
const { t } = useI18n();
const entries = ref<AuditEntry[]>([]);
const stats = ref<AuditStats | null>(null);
const loading = ref(true);

onMounted(async () => { await load(); });

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [list, s] = await Promise.all([
      bffFetch<AuditEntry[]>('/api/audit?limit=100'),
      bffFetch<AuditStats>('/api/audit/stats'),
    ]);
    entries.value = list;
    stats.value = s;
  } catch {
    msg.error(t('common.unknownError'));
  } finally {
    loading.value = false;
  }
}

function outcomeType(outcome: string): 'success' | 'error' | 'warning' | 'default' {
  if (outcome === 'success') return 'success';
  if (outcome === 'failure') return 'error';
  if (outcome === 'denied') return 'warning';
  return 'default';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <ViewErrorBoundary name="audit">
    <div class="audit-page px-6 py-6 max-w-[1400px] mx-auto">
      <div class="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('audit.title') }}</h2>
          <p class="text-sm text-[var(--text-3)]">{{ t('audit.subtitle') }}</p>
        </div>
        <NButton
          size="small"
          quaternary
          :loading="loading"
          :disabled="loading"
          :aria-label="t('common.refresh')"
          @click="load"
        >
          {{ t('common.refresh') }}
        </NButton>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ThemedSkeleton v-for="i in 3" :key="`stat-${i}`" height="84px" rounded="lg" />
        </div>
        <div class="space-y-2">
          <ThemedSkeleton v-for="i in 6" :key="`row-${i}`" height="44px" />
        </div>
      </div>
      <template v-else>
        <!-- Stat cards -->
        <div v-if="stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
            <div class="text-xs text-[var(--text-3)] mb-1">{{ t('audit.total') }}</div>
            <div class="text-2xl font-bold text-[var(--text-1)]">{{ stats.total }}</div>
          </div>
          <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
            <div class="text-xs text-[var(--text-3)] mb-1">{{ t('audit.last24h') }}</div>
            <div class="text-2xl font-bold text-[var(--text-1)]">{{ stats.last24h }}</div>
          </div>
          <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
            <div class="text-xs text-[var(--text-3)] mb-1">{{ t('audit.denied') }}</div>
            <div class="text-2xl font-bold text-[var(--color-warning)]">{{ stats.denied }}</div>
          </div>
        </div>

        <!-- Top actions -->
        <div
          v-if="stats?.topActions?.length"
          class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-6"
        >
          <h3 class="text-sm font-semibold text-[var(--text-1)] mb-3">{{ t('audit.topActions') }}</h3>
          <div class="flex flex-wrap gap-2">
            <NTag v-for="a in stats.topActions" :key="a.action" size="small" :bordered="false">
              {{ a.action }} · {{ a.count }}
            </NTag>
          </div>
        </div>

        <!-- Entries -->
        <div v-if="entries.length === 0" class="py-16">
          <EmptyState :title="t('audit.noData')" icon="🔒" />
        </div>
        <div v-else class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div
            v-for="e in entries"
            :key="e.id"
            class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 text-sm"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0"
              :class="e.outcome === 'success' ? 'bg-emerald-500' : e.outcome === 'failure' ? 'bg-rose-500' : e.outcome === 'denied' ? 'bg-amber-500' : 'bg-slate-400'"
              aria-hidden="true"
            />
            <span class="text-[var(--text-3)] w-[150px] flex-shrink-0 tabular-nums">{{ formatTime(e.timestamp) }}</span>
            <span class="font-medium text-[var(--text-1)] w-[140px] flex-shrink-0 truncate">{{ e.action }}</span>
            <span class="text-[var(--text-2)] w-[120px] flex-shrink-0 truncate">{{ e.actor }}</span>
            <span class="text-[var(--text-2)] flex-1 truncate" :title="e.resource">{{ e.resource }}</span>
            <span class="text-[var(--text-3)] w-[120px] flex-shrink-0 truncate">{{ e.ip }}</span>
            <NTag :type="outcomeType(e.outcome)" size="tiny" class="flex-shrink-0">{{ e.outcome }}</NTag>
          </div>
        </div>
      </template>
    </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.audit-page { min-height: calc(100vh - 140px); }
</style>
