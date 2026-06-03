<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NTag, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import EmptyState from '@/components/shared/EmptyState.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import { useI18n } from 'vue-i18n';

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | string;
  actionable: boolean;
  suggestedAction?: string;
  source?: string;
}

const msg = useMessage();
const { t } = useI18n();
const suggestions = ref<Suggestion[]>([]);
const scanning = ref(false);

onMounted(async () => { await scan(); });

async function scan(): Promise<void> {
  scanning.value = true;
  try {
    suggestions.value = await bffFetch<Suggestion[]>('/api/proactive/scan');
  } catch {
    msg.error(t('common.unknownError'));
  } finally {
    scanning.value = false;
  }
}

function severityType(severity: string): 'error' | 'warning' | 'default' {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'default';
}

function severityLabel(severity: string): string {
  if (severity === 'critical') return t('proactive.severityCritical');
  if (severity === 'warning') return t('proactive.severityWarning');
  return t('proactive.severityInfo');
}

function severityBorder(severity: string): string {
  if (severity === 'critical') return 'border-l-rose-500';
  if (severity === 'warning') return 'border-l-amber-500';
  return 'border-l-slate-400';
}
</script>

<template>
  <ViewErrorBoundary name="proactive">
    <div class="proactive-page px-6 py-6 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('proactive.title') }}</h2>
          <p class="text-sm text-[var(--text-3)]">{{ t('proactive.subtitle') }}</p>
        </div>
        <NButton type="primary" :loading="scanning" :disabled="scanning" @click="scan">
          {{ scanning ? t('proactive.scanning') : t('proactive.scan') }}
        </NButton>
      </div>

      <div v-if="scanning && suggestions.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ThemedSkeleton v-for="i in 4" :key="i" height="120px" rounded="lg" />
      </div>
      <div v-else-if="suggestions.length === 0" class="py-16">
        <EmptyState :title="t('proactive.empty')" icon="🔮" />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="s in suggestions"
          :key="s.id"
          class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] border-l-4 p-5"
          :class="severityBorder(s.severity)"
        >
          <div class="flex items-start justify-between gap-3 mb-2">
            <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ s.title }}</h3>
            <NTag :type="severityType(s.severity)" size="tiny" class="flex-shrink-0">{{ severityLabel(s.severity) }}</NTag>
          </div>
          <p class="text-sm text-[var(--text-2)] mb-3">{{ s.description }}</p>
          <div v-if="s.suggestedAction" class="text-xs text-[var(--text-2)] mb-2">
            <span class="font-semibold text-[var(--text-3)]">{{ t('proactive.suggestedAction') }}: </span>
            {{ s.suggestedAction }}
          </div>
          <div v-if="s.source" class="text-xs text-[var(--text-3)]">
            <span class="font-semibold">{{ t('proactive.source') }}: </span>{{ s.source }}
          </div>
        </div>
      </div>
    </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.proactive-page { min-height: calc(100vh - 140px); }
</style>
