<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NTooltip } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { fmtDateTime, humanizeGap } from '@/utils/cron-helpers';

const props = defineProps<{
  total: number;
  active: number;
  earliestNextRun: number | null;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'refresh'): void;
}>();

const { t, locale } = useI18n();

const nextLabel = computed<string>(() => {
  if (props.earliestNextRun === null) return t('cron.bar.noUpcoming');
  return `${fmtDateTime(props.earliestNextRun)} · ${humanizeGap(props.earliestNextRun, locale.value as 'zh-CN' | 'en-US')}`;
});
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span class="text-[var(--text-2)]">
        {{ t('cron.bar.total', { n: total }) }}
      </span>
      <span class="inline-flex items-center gap-1.5 text-[var(--text-2)]">
        <span
          class="inline-block w-1.5 h-1.5 rounded-full"
          :class="active > 0 ? 'bg-emerald-500' : 'bg-[var(--text-3)] opacity-60'"
        />
        {{ t('cron.bar.active', { n: active }) }}
      </span>
      <NTooltip v-if="earliestNextRun !== null" trigger="hover">
        <template #trigger>
          <span class="text-[var(--text-3)]">{{ t('cron.bar.nextRun') }}: {{ nextLabel }}</span>
        </template>
        {{ fmtDateTime(earliestNextRun) }}
      </NTooltip>
      <span v-else class="text-[var(--text-3)]">
        {{ t('cron.bar.nextRun') }}: {{ nextLabel }}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <NButton size="small" quaternary :loading="refreshing" @click="emit('refresh')">
        {{ t('cron.bar.refresh') }}
      </NButton>
      <NButton type="primary" size="small" @click="emit('create')">
        {{ t('cron.bar.create') }}
      </NButton>
    </div>
  </div>
</template>
