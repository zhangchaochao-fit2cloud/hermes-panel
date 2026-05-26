<script setup lang="ts">
import { NTag, NDropdown, NButton, type DropdownOption } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { SessionSummary } from '@hermes-panel/shared';
import { relativeTime, absoluteTime, type Locale } from '@/utils/relative-time';

defineProps<{
  items: SessionSummary[];
}>();

const emit = defineEmits<{
  (e: 'open', id: string): void;
  (e: 'rename', row: SessionSummary): void;
  (e: 'delete', row: SessionSummary): void;
  (e: 'export', row: SessionSummary): void;
}>();

const { t, locale } = useI18n();

function fmtNum(n: number): string {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}m`;
}

function actions(): DropdownOption[] {
  return [
    { key: 'open', label: t('sessions.action.open') },
    { key: 'rename', label: t('sessions.action.rename') },
    { key: 'export', label: t('sessions.action.export') },
    { type: 'divider', key: 'd1' },
    { key: 'delete', label: t('sessions.action.delete') },
  ];
}

function handle(key: string | number, row: SessionSummary): void {
  if (key === 'open') emit('open', row.id);
  else if (key === 'rename') emit('rename', row);
  else if (key === 'export') emit('export', row);
  else if (key === 'delete') emit('delete', row);
}
</script>

<template>
  <div class="grid gap-4 p-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <div
      v-for="row in items"
      :key="row.id"
      class="session-card group relative flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 cursor-pointer transition-all hover:shadow-[var(--shadow-2)] hover:border-[var(--brand-500)]"
      @dblclick="emit('open', row.id)"
    >
      <!-- header -->
      <div class="flex items-start gap-2 mb-2">
        <h3
          class="flex-1 text-sm font-semibold leading-snug line-clamp-2 text-[var(--text-1)]"
          :title="row.title"
        >
          {{ row.title }}
        </h3>
        <NDropdown
          trigger="click"
          :options="actions()"
          @select="(k: string | number) => handle(k, row)"
        >
          <NButton
            size="tiny"
            quaternary
            circle
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop
          >
            ⋯
          </NButton>
        </NDropdown>
      </div>

      <!-- model badge -->
      <div class="mb-3">
        <NTag size="small" :bordered="false" type="info">{{ row.model }}</NTag>
      </div>

      <!-- stats -->
      <div class="flex items-center gap-4 text-xs opacity-70 mb-2 tabular-nums">
        <div class="flex items-center gap-1">
          <span>💬</span>
          <span>{{ row.messageCount }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span>⚡</span>
          <span>{{ fmtNum(row.tokenTotal) }}</span>
        </div>
      </div>

      <!-- footer -->
      <div class="mt-auto text-[11px] opacity-50">
        <span :title="absoluteTime(row.updatedAt)">
          {{ t('sessions.updatedPrefix') }}
          {{ relativeTime(row.updatedAt, locale as Locale) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.session-card:hover {
  background-color: color-mix(in srgb, var(--brand-500) 2%, var(--bg-card));
}
</style>
