<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NSelect,
  NInput,
  NInputNumber,
  NButton,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/shared/EmptyState.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import DebugShareHandoffPanel from './DebugShareHandoffPanel.vue';
import { useLogsStore, type LogLevelFilter, type LogLine } from '@/stores/logs';

const { t } = useI18n();
const message = useMessage();
const store = useLogsStore();
const { lines, filters, loading, error, autoRefresh } = storeToRefs(store);

const listRef = ref<HTMLDivElement | null>(null);

const levelOptions = computed(() => [
  { label: t('developer.logs.level.all'), value: 'all' as LogLevelFilter },
  { label: 'DEBUG', value: 'DEBUG' as LogLevelFilter },
  { label: 'INFO', value: 'INFO' as LogLevelFilter },
  { label: 'WARN', value: 'WARNING' as LogLevelFilter },
  { label: 'ERROR', value: 'ERROR' as LogLevelFilter },
]);

function chipType(level: string | undefined): 'default' | 'info' | 'warning' | 'error' {
  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
      return 'error';
    case 'WARNING':
    case 'WARN':
      return 'warning';
    case 'INFO':
      return 'info';
    default:
      return 'default';
  }
}

function chipColor(level: string | undefined): string {
  // CSS color tokens for level chips. Kept inline so they remain stable even
  // if Naive UI's tag palette is themed differently.
  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
      return 'var(--color-error, #e88080)';
    case 'WARNING':
    case 'WARN':
      return '#f0a020';
    case 'INFO':
      return 'var(--brand-500, #3b82f6)';
    case 'DEBUG':
    default:
      return 'var(--text-3, #9aa0a6)';
  }
}

function formatTime(ts: number | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  const el = listRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function refresh(): Promise<void> {
  await store.load();
  if (autoRefresh.value) await scrollToBottom();
}

function onToggleAutoRefresh(value: boolean): void {
  if (value !== autoRefresh.value) store.toggleAutoRefresh();
}

function onLevelChange(value: LogLevelFilter): void {
  store.setFilter('level', value);
  void store.load();
}

function onTailChange(value: number | null): void {
  const next = value && value > 0 ? Math.floor(value) : 200;
  store.setFilter('tail', next);
}

function onQueryChange(value: string): void {
  store.setFilter('query', value);
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
watch(() => filters.value.query, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { void store.load(); }, 300);
});

async function copyAll(): Promise<void> {
  const text = lines.value.map((l: LogLine) => l.raw).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('developer.logs.copied', { count: lines.value.length }));
  } catch {
    message.error(t('developer.logs.copyFailed'));
  }
}

// Auto-scroll on new data while auto-refresh is enabled.
watch(lines, () => {
  if (autoRefresh.value) void scrollToBottom();
});

onMounted(() => {
  void store.load();
});

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce);
  store.stopAutoRefresh();
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <DebugShareHandoffPanel />

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-2">
      <NSelect
        :value="filters.level"
        :options="levelOptions"
        size="small"
        style="width: 120px"
        @update:value="onLevelChange"
      />
      <NInputNumber
        :value="filters.tail"
        :min="1"
        :max="5000"
        :step="50"
        size="small"
        style="width: 120px"
        :placeholder="t('developer.logs.tailPlaceholder')"
        @update:value="onTailChange"
      />
      <NInput
        :value="filters.query"
        size="small"
        :placeholder="t('developer.logs.searchPlaceholder')"
        clearable
        style="max-width: 280px"
        @update:value="onQueryChange"
      />
      <NButton
        size="small"
        :loading="loading"
        @click="refresh"
      >
        {{ t('developer.logs.refresh') }}
      </NButton>
      <span class="text-xs text-[var(--text-3)] flex items-center gap-2">
        {{ t('developer.logs.autoRefresh') }}
        <NSwitch
          :value="autoRefresh"
          size="small"
          @update:value="onToggleAutoRefresh"
        />
      </span>
      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs text-[var(--text-3)]">
          {{ t('developer.logs.lineCount', { n: lines.length }) }}
        </span>
        <NButton size="small" tertiary @click="copyAll">
          {{ t('developer.logs.copyAll') }}
        </NButton>
      </div>
    </div>

    <!-- Error banner -->
    <ErrorBanner
      v-if="error"
      :message="`${t('developer.logs.errorPrefix')} ${error}`"
      :retry-label="t('developer.logs.refresh')"
      surface="inline"
      @retry="refresh"
    />

    <!-- Log list -->
    <div
      ref="listRef"
      class="rounded-md border overflow-auto font-mono text-xs"
      style="
        background: var(--bg-card);
        border-color: var(--border);
        max-height: 600px;
        min-height: 280px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      "
    >
      <div v-if="loading && lines.length === 0" class="p-3">
        <ThemedSkeleton height="18px" :repeat="8" rounded="sm" />
      </div>
      <EmptyState
        v-else-if="lines.length === 0"
        icon="≡"
        :title="t('developer.logs.empty')"
      />
      <ul v-else class="divide-y" style="border-color: var(--border)">
        <li
          v-for="(line, idx) in lines"
          :key="idx"
          class="px-3 py-1.5 flex gap-2 items-start hover:bg-[var(--bg-elevate)]"
        >
          <span class="text-[var(--text-3)] shrink-0 tabular-nums" style="min-width: 84px">
            {{ formatTime(line.ts) }}
          </span>
          <NTag
            v-if="line.level"
            :type="chipType(line.level)"
            size="small"
            round
            :bordered="false"
            class="shrink-0"
            :style="{ minWidth: '56px', justifyContent: 'center', color: chipColor(line.level) }"
          >
            {{ line.level === 'WARNING' ? 'WARN' : line.level }}
          </NTag>
          <span
            v-if="line.component"
            class="shrink-0 text-[var(--text-2)]"
            style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
            :title="line.component"
          >
            {{ line.component }}
          </span>
          <span class="text-[var(--text-1)] break-all whitespace-pre-wrap">
            {{ line.msg || line.raw }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
