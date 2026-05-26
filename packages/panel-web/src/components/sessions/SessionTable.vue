<script setup lang="ts">
import { computed, h } from 'vue';
import type { VNodeChild } from 'vue';
import {
  NDataTable,
  NButton,
  NDropdown,
  NTag,
  type DataTableColumns,
  type DropdownOption,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { SessionSummary } from '@hermes-panel/shared';
import { relativeTime, absoluteTime, type Locale } from '@/utils/relative-time';

const props = defineProps<{
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

function rowActions(): DropdownOption[] {
  return [
    { key: 'open', label: t('sessions.action.open') },
    { key: 'rename', label: t('sessions.action.rename') },
    { key: 'export', label: t('sessions.action.export') },
    { type: 'divider', key: 'd1' },
    { key: 'delete', label: t('sessions.action.delete') },
  ];
}

function handleAction(key: string | number, row: SessionSummary): void {
  if (key === 'open') emit('open', row.id);
  else if (key === 'rename') emit('rename', row);
  else if (key === 'export') emit('export', row);
  else if (key === 'delete') emit('delete', row);
}

const SOURCE_META: Record<string, { icon: string; tone: 'info' | 'warning' | 'success' | 'default' }> = {
  cli:        { icon: '💬', tone: 'success' },
  cron:       { icon: '⏰', tone: 'warning' },
  api_server: { icon: '🔌', tone: 'info' },
  unknown:    { icon: '❔', tone: 'default' },
};

const columns = computed<DataTableColumns<SessionSummary>>(() => [
  {
    title: t('sessions.col.source'),
    key: 'source',
    width: 100,
    render: (row): VNodeChild => {
      const m = SOURCE_META[row.source] ?? SOURCE_META.unknown;
      return h(
        NTag,
        {
          size: 'small',
          bordered: false,
          type: m.tone,
          title: t(`sessions.source.${row.source}`),
        },
        { default: () => `${m.icon} ${t(`sessions.source.${row.source}`)}` },
      );
    },
  },
  {
    title: t('sessions.col.title'),
    key: 'title',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: (row): VNodeChild =>
      h(
        'span',
        { class: 'font-medium text-[var(--text-1)]' },
        row.title,
      ),
  },
  {
    title: t('sessions.col.model'),
    key: 'model',
    width: 160,
    render: (row): VNodeChild =>
      h(
        NTag,
        { size: 'small', bordered: false, type: 'info' },
        { default: () => row.model },
      ),
  },
  {
    title: t('sessions.col.messages'),
    key: 'messageCount',
    width: 96,
    align: 'right',
    render: (row): VNodeChild => h('span', { class: 'tabular-nums' }, String(row.messageCount)),
  },
  {
    title: t('sessions.col.tokens'),
    key: 'tokenTotal',
    width: 110,
    align: 'right',
    render: (row): VNodeChild => h('span', { class: 'tabular-nums opacity-80' }, fmtNum(row.tokenTotal)),
  },
  {
    title: t('sessions.col.updatedAt'),
    key: 'updatedAt',
    width: 160,
    render: (row): VNodeChild =>
      h(
        'span',
        { class: 'opacity-70', title: absoluteTime(row.updatedAt) },
        relativeTime(row.updatedAt, locale.value as Locale),
      ),
  },
  {
    title: '',
    key: 'actions',
    width: 64,
    align: 'right',
    render: (row): VNodeChild =>
      h(
        NDropdown,
        {
          trigger: 'click',
          options: rowActions(),
          onSelect: (key: string | number) => handleAction(key, row),
        },
        {
          default: () =>
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                circle: true,
                onClick: (e: MouseEvent) => e.stopPropagation(),
              },
              { default: () => '⋯' },
            ),
        },
      ),
  },
]);

const rowProps = (row: SessionSummary): Record<string, unknown> => ({
  class: 'session-row cursor-pointer',
  onDblclick: () => emit('open', row.id),
});

const rowKey = (row: SessionSummary): string => row.id;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _items = computed(() => props.items);
</script>

<template>
  <div class="session-table-wrap">
    <NDataTable
      :columns="columns"
      :data="_items"
      :row-key="rowKey"
      :row-props="rowProps"
      :bordered="false"
      :single-line="false"
      size="medium"
      flex-height
      class="!h-full"
    />
  </div>
</template>

<style scoped>
.session-table-wrap {
  height: 100%;
}
.session-table-wrap :deep(.session-row:hover > td) {
  background-color: color-mix(in srgb, var(--brand-500) 4%, transparent);
}
</style>
