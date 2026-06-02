<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

const { t } = useI18n();

interface ToolStat {
  tool: string;
  count: number;
  pct: number;
}

const data = ref<ToolStat[]>([]);
const loading = ref(false);
const error = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    const rows = await bffFetch<ToolStat[]>('/api/stats/tools?days=30');
    data.value = rows.slice(0, 10);
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
      <h3 class="text-sm font-semibold">{{ t('dashboard.toolUsage.title') }}</h3>
      <span class="text-xs text-[var(--text-3)]">{{ t('dashboard.toolUsage.subtitle') }}</span>
    </div>

    <div v-if="error" class="h-20 flex items-center justify-center">
      <button class="text-sm text-[var(--brand-600)]" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="loading" class="space-y-2.5">
      <ThemedSkeleton v-for="i in 5" :key="i" height="20px" />
    </div>

    <div v-else-if="data.length === 0" class="h-20 flex items-center justify-center text-sm text-[var(--text-3)]">
      {{ t('dashboard.toolUsage.noData') }}
    </div>

    <div v-else class="space-y-2">
      <div v-for="row in data" :key="row.tool" class="flex items-center gap-2 text-xs">
        <span class="w-28 shrink-0 truncate text-[var(--text-2)] font-mono" :title="row.tool">{{ row.tool }}</span>
        <div class="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            class="h-full rounded-full transition-[width] duration-500 ease-out"
            :style="{
              width: `${row.pct}%`,
              backgroundColor: `color-mix(in srgb, var(--brand-500) ${40 + row.pct * 0.6}%, transparent)`,
            }"
          />
        </div>
        <span class="w-8 text-right font-mono text-[var(--text-3)]">{{ row.pct }}%</span>
        <span class="w-16 text-right text-[var(--text-3)] hidden sm:block">
          {{ t('dashboard.toolUsage.calls', { n: row.count }) }}
        </span>
      </div>
    </div>
  </div>
</template>
