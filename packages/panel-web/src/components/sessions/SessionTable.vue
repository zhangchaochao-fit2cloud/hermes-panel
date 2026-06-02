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
import { displaySessionTitle } from '@/utils/session-title';

const props = defineProps<{
  items: SessionSummary[];
}>();

const emit = defineEmits<{
  (e: 'open', id: string): void;
  (e: 'rename', row: SessionSummary): void;
  (e: 'delete', row: SessionSummary): void;
  (e: 'export', row: SessionSummary): void;
  /** hover 浮层：传 session id + 当前 row 的 boundingRect */
  (e: 'hoverPreview', id: string | null, rect: DOMRect | null): void;
}>();

const { t, locale } = useI18n();

function fmtNum(n: number): string {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}m`;
}

function titleOf(row: SessionSummary): string {
  return displaySessionTitle(row, t('sessions.untitled'));
}

function qualityScore(row: SessionSummary): number {
  let score = 50;
  if (row.tokenTotal > 2000) score += 15;
  if (row.messageCount > 4) score += 10;
  if (/opus|sonnet/i.test(row.model)) score += 10;
  if (row.messageCount <= 1) score -= 10;
  if (row.tokenTotal < 200) score -= 15;
  return Math.max(0, Math.min(100, score));
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

// 统一灰底 tag — 之前每条来源一种色（success/warning/info）和模型 tag 撞色，
// 表格一行 4 个不同颜色块视觉混乱。靠 icon 区分来源足够，颜色留给状态语义。
const SOURCE_META: Record<string, { icon: string; tone: 'info' | 'warning' | 'success' | 'default' }> = {
  cli:        { icon: '💬', tone: 'default' },
  cron:       { icon: '⏰', tone: 'default' },
  api_server: { icon: '🔌', tone: 'default' },
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
        titleOf(row),
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
    title: t('sessions.col.quality'),
    key: 'quality',
    width: 80,
    align: 'right',
    render: (row): VNodeChild => {
      const score = qualityScore(row);
      const color = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';
      return h(
        NTag,
        {
          size: 'small',
          bordered: false,
          type: color,
          title: 'Local quality estimate',
        },
        { default: () => String(score) },
      );
    },
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

// hover 0.5s 后才展示浮层 — 避免快速移动鼠标导致一连串 fetch
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
function onRowEnter(row: SessionSummary, e: MouseEvent): void {
  if (hoverTimer) clearTimeout(hoverTimer);
  const el = (e.currentTarget as HTMLElement) ?? null;
  hoverTimer = setTimeout(() => {
    if (!el) return;
    emit('hoverPreview', row.id, el.getBoundingClientRect());
  }, 500);
}
function onRowLeave(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  emit('hoverPreview', null, null);
}

const rowProps = (row: SessionSummary): Record<string, unknown> => ({
  class: 'session-row cursor-pointer',
  onDblclick: () => emit('open', row.id),
  onMouseenter: (e: MouseEvent) => onRowEnter(row, e),
  onMouseleave: () => onRowLeave(),
});

const rowKey = (row: SessionSummary): string => row.id;
</script>

<template>
  <div class="session-table-wrap">
    <NDataTable
      :columns="columns"
      :data="props.items"
      :row-key="rowKey"
      :row-props="rowProps"
      :bordered="false"
      :single-line="false"
      size="medium"
    />
  </div>
</template>

<style scoped>
.session-table-wrap :deep(.session-row:hover > td) {
  background-color: color-mix(in srgb, var(--brand-500) 4%, transparent);
}
</style>
