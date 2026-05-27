<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { NPopover } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useUsageStore, type UsageBucket } from '@/stores/usage';
import { formatCompact, formatUsd } from '@/utils/format-number';

const { t } = useI18n();
const usage = useUsageStore();
const { today, thisMonth, allTime, topModels, loading } = storeToRefs(usage);

onMounted(() => { void usage.load(); });

interface Tile { label: string; bucket: UsageBucket; accent: string }
const tiles = computed<Tile[]>(() => [
  { label: t('dashboard.usage.today'),     bucket: today.value,     accent: '#22d3ee' },
  { label: t('dashboard.usage.thisMonth'), bucket: thisMonth.value, accent: '#a78bfa' },
  { label: t('dashboard.usage.allTime'),   bucket: allTime.value,   accent: '#34d399' },
]);

function costLabel(b: UsageBucket): string {
  // We render "—" when nothing priced has landed in the bucket so users
  // know the number isn't a 0.00 reading on a known-zero cost.
  if (!b.runs || b.cost <= 0) return t('dashboard.usage.noCost');
  return formatUsd(b.cost);
}
</script>

<template>
  <section class="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-1)]">
    <div class="mb-4 flex items-baseline justify-between">
      <h3 class="text-sm font-semibold">{{ t('dashboard.usage.title') }}</h3>
      <n-popover trigger="click" placement="bottom-end" :width="280">
        <template #trigger>
          <button
            class="text-xs text-[var(--brand-600)] hover:underline disabled:opacity-50"
            :disabled="topModels.length === 0"
          >
            {{ t('dashboard.usage.topModels') }}
          </button>
        </template>
        <div class="text-xs">
          <div class="mb-2 font-semibold text-[var(--text-2)]">
            {{ t('dashboard.usage.topModels') }}
          </div>
          <div v-if="topModels.length === 0" class="text-[var(--text-3)]">
            {{ t('dashboard.empty') }}
          </div>
          <ul v-else class="space-y-1.5">
            <li
              v-for="row in topModels"
              :key="row.model"
              class="flex items-baseline justify-between gap-3"
            >
              <span class="truncate font-mono text-[11px]" :title="row.model">{{ row.model }}</span>
              <span class="shrink-0 tabular-nums text-[var(--text-3)]">
                {{ formatCompact(row.tokens) }}
                <span class="opacity-60"> · </span>
                {{ row.cost > 0 ? formatUsd(row.cost) : t('dashboard.usage.noCost') }}
              </span>
            </li>
          </ul>
        </div>
      </n-popover>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="t0 in tiles"
        :key="t0.label"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-page)] px-3 py-3"
      >
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
            {{ t0.label }}
          </div>
          <div class="h-1.5 w-1.5 rounded-full" :style="{ background: t0.accent }" />
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold tabular-nums">
            <template v-if="loading">—</template>
            <template v-else>{{ formatCompact(t0.bucket.tokens) }}</template>
          </span>
          <span class="text-[10px] text-[var(--text-3)]">{{ t('dashboard.usage.tokensSuffix') }}</span>
        </div>
        <div class="mt-1 text-xs tabular-nums text-[var(--text-3)]">
          <template v-if="loading">—</template>
          <template v-else>{{ costLabel(t0.bucket) }}</template>
        </div>
      </div>
    </div>
  </section>
</template>
