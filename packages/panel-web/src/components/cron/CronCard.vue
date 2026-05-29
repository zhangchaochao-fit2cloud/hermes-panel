<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NDropdown,
  NTag,
  NTooltip,
  NInput,
  type DropdownOption,
  useDialog,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { CronJob } from '@/stores/cron';
import { useSessionsStore } from '@/stores/sessions';
import {
  fmtDateTime,
  fmtTime,
  humanizeGap,
  nextRuns,
  tsToMs,
} from '@/utils/cron-helpers';

const props = defineProps<{ job: CronJob }>();
const router = useRouter();
const sessionsStore = useSessionsStore();
const { items: allSessions, initialized: sessionsLoaded } = storeToRefs(sessionsStore);

onMounted(() => {
  if (!sessionsLoaded.value) void sessionsStore.load({ initial: true });
});

// 从 session id 中提取 cron-job-id：cron_<jobid>_<ts>
const CRON_ID_RE = /^cron_([a-f0-9]+)_/i;

// 该 job 的所有 sessions（按 updatedAt DESC 排序）
const jobSessions = computed(() => {
  return allSessions.value
    .filter(s => {
      if (s.source !== 'cron') return false;
      const m = s.id.match(CRON_ID_RE);
      return m && m[1] === props.job.id;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
});

const runStats = computed(() => {
  const list = jobSessions.value;
  return {
    count: list.length,
    totalMessages: list.reduce((s, x) => s + (x.messageCount ?? 0), 0),
    totalTokens: list.reduce((s, x) => s + (x.tokenTotal ?? 0), 0),
  };
});

function openSession(id: string): void {
  void router.push({ path: '/chat', query: { id } });
}

function openAggregateView(): void {
  void router.push({ path: '/chat', query: { cron: props.job.id } });
}

function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

const emit = defineEmits<{
  (e: 'pause', id: string): void;
  (e: 'resume', id: string): void;
  (e: 'run', id: string): void;
  (e: 'remove', job: CronJob): void;
}>();

const { t, locale } = useI18n();
const dialog = useDialog();

const PROMPT_LIMIT = 500;

const nextRunMs = computed(() => tsToMs(props.job.nextRun));
const lastRunMs = computed(() => tsToMs(props.job.lastRun));

const nextRelative = computed<string>(() => {
  if (nextRunMs.value === null) return '-';
  return humanizeGap(nextRunMs.value, locale.value as 'zh-CN' | 'en-US');
});

const upcoming = computed<number[]>(() => {
  if (!props.job.active) return [];
  return nextRuns(props.job.schedule, 3);
});

const promptDisplay = computed<string>(() => {
  const p = props.job.prompt ?? '';
  if (p.length <= PROMPT_LIMIT) return p;
  return `${p.slice(0, PROMPT_LIMIT)}…`;
});

const lastResultIsOk = computed(() => (props.job.lastResult ?? '').toLowerCase() === 'ok');
const lastResultIsFail = computed(() => {
  const r = (props.job.lastResult ?? '').toLowerCase();
  return r === 'failed' || r === 'error' || r === 'fail';
});

const moreOptions = computed<DropdownOption[]>(() => [
  { key: 'remove', label: t('cron.card.actions.delete'), props: { style: 'color: var(--error-color, #e53e3e)' } },
]);

const confirmInput = ref('');

function onMoreSelect(key: string | number): void {
  if (key !== 'remove') return;
  confirmInput.value = '';
  dialog.warning({
    title: t('cron.card.deleteConfirm.title'),
    content: () =>
      h('div', { class: 'flex flex-col gap-2' }, [
        h('p', { class: 'text-sm' }, t('cron.card.deleteConfirm.content', { name: props.job.name || props.job.id })),
        h('p', { class: 'text-xs text-[var(--text-3)]' }, t('cron.card.deleteConfirm.typeName')),
        h(NInput, {
          value: confirmInput.value,
          'onUpdate:value': (v: string) => { confirmInput.value = v; },
          placeholder: props.job.name || props.job.id,
          autofocus: true,
          size: 'small',
        }),
      ]),
    positiveText: t('cron.card.actions.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      const need = props.job.name || props.job.id;
      if (confirmInput.value.trim() !== need) {
        return false;
      }
      emit('remove', props.job);
      return true;
    },
  });
}
</script>

<template>
  <div
    class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] transition-shadow flex flex-col gap-3"
  >
    <!-- header -->
    <div class="flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="inline-block w-2 h-2 rounded-full flex-shrink-0"
            :class="job.active ? 'status-dot-success' : 'status-dot-neutral opacity-60'"
            :title="job.active ? t('cron.card.active') : t('cron.card.paused')"
          />
          <h3 class="text-sm font-semibold truncate" :title="job.name">
            {{ job.name || job.id }}
          </h3>
          <NTag size="tiny" :bordered="false" :type="job.active ? 'success' : 'default'">
            {{ job.active ? t('cron.card.active') : t('cron.card.paused') }}
          </NTag>
        </div>
        <div class="text-[11px] text-[var(--text-3)] font-mono truncate">{{ job.id }}</div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <NTooltip v-if="job.active" trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary circle :aria-label="t('cron.card.actions.pause')" @click="emit('pause', job.id)">
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5.5 3.5v9M10.5 3.5v9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </NButton>
          </template>
          {{ t('cron.card.actions.pause') }}
        </NTooltip>
        <NTooltip v-else trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary circle type="primary" :aria-label="t('cron.card.actions.resume')" @click="emit('resume', job.id)">
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5.5 3.5 12 8l-6.5 4.5v-9Z" fill="currentColor" />
              </svg>
            </NButton>
          </template>
          {{ t('cron.card.actions.resume') }}
        </NTooltip>
        <NTooltip v-if="job.active" trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary @click="emit('run', job.id)">
              <template #icon>
                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5.5 3.5 12 8l-6.5 4.5v-9Z" fill="currentColor" />
                </svg>
              </template>
              {{ t('cron.card.actions.runNow') }}
            </NButton>
          </template>
          {{ t('cron.card.actions.runNowTooltip') }}
        </NTooltip>
        <NDropdown trigger="click" :options="moreOptions" @select="onMoreSelect">
          <NButton size="tiny" quaternary circle>⋯</NButton>
        </NDropdown>
      </div>
    </div>

    <!-- meta grid -->
    <div class="grid grid-cols-1 gap-1.5 text-xs">
      <div class="flex items-center gap-2">
        <span class="opacity-70 flex-shrink-0">⏰</span>
        <code class="font-mono text-[12px] bg-[var(--bg-elevate)] px-1.5 py-0.5 rounded truncate">{{ job.schedule }}</code>
        <span class="opacity-60 truncate">{{ job.repeat }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="opacity-70 flex-shrink-0">📅</span>
        <NTooltip v-if="nextRunMs !== null" trigger="hover">
          <template #trigger>
            <span class="truncate">
              {{ t('cron.card.next') }}:
              <span class="tabular-nums">{{ fmtTime(nextRunMs) }}</span>
              <span class="opacity-60">（{{ nextRelative }}）</span>
            </span>
          </template>
          {{ fmtDateTime(nextRunMs) }}
        </NTooltip>
        <span v-else class="opacity-60">{{ t('cron.card.next') }}: -</span>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="flex-shrink-0"
          :class="lastResultIsOk ? 'text-status-success' : lastResultIsFail ? 'text-status-error' : 'opacity-70'"
        >
          {{ lastResultIsOk ? '✓' : lastResultIsFail ? '✗' : '·' }}
        </span>
        <NTooltip v-if="lastRunMs !== null" trigger="hover">
          <template #trigger>
            <span class="truncate">
              {{ t('cron.card.last') }}:
              <span class="tabular-nums">{{ fmtTime(lastRunMs) }}</span>
              <span
                v-if="job.lastResult"
                :class="lastResultIsOk ? 'text-status-success' : lastResultIsFail ? 'text-status-error' : 'opacity-60'"
              >
                {{ job.lastResult }}
              </span>
            </span>
          </template>
          {{ fmtDateTime(lastRunMs) }}
        </NTooltip>
        <span v-else class="opacity-60">{{ t('cron.card.last') }}: {{ t('cron.card.never') }}</span>
      </div>

      <div v-if="job.deliver" class="flex items-center gap-2">
        <span class="opacity-70 flex-shrink-0">📨</span>
        <span class="truncate">
          {{ t('cron.card.deliver') }}:
          <code class="font-mono text-[11px] opacity-80">{{ job.deliver }}</code>
        </span>
      </div>
    </div>

    <!-- upcoming runs preview -->
    <div v-if="upcoming.length > 0" class="text-[11px] text-[var(--text-3)] flex flex-wrap gap-x-3 gap-y-0.5 border-t border-[var(--border)] pt-2">
      <span class="font-medium">{{ t('cron.card.upcoming') }}:</span>
      <span v-for="ts in upcoming" :key="ts" class="tabular-nums">{{ fmtDateTime(ts) }}</span>
    </div>

    <!-- 执行历史汇总（永远显示一行）+ prompt preview (collapsible) -->
    <div class="border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-3)] flex flex-wrap items-center gap-x-3 gap-y-1">
      <span class="font-medium text-[var(--text-2)]">{{ t('cron.card.history.label') }}</span>
      <span>{{ t('cron.card.history.runs', { n: runStats.count }) }}</span>
      <template v-if="runStats.count > 0">
        <span class="opacity-50">·</span>
        <span>{{ t('cron.card.history.tokens', { n: fmtTokens(runStats.totalTokens) }) }}</span>
        <span class="opacity-50">·</span>
        <span>{{ t('cron.card.history.messages', { n: runStats.totalMessages }) }}</span>
        <button
          type="button"
          class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[var(--brand-600)] hover:bg-[var(--brand-500)]/10 transition-colors"
          :title="t('cron.card.history.aggregateView')"
          @click="openAggregateView"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="2" />
            <path d="M2 7h12M6 3v10" />
          </svg>
          {{ t('cron.card.history.aggregateView') }}
        </button>
      </template>
    </div>

    <NCollapse v-if="job.prompt || runStats.count > 0" arrow-placement="right" :default-expanded-names="[]">
      <NCollapseItem v-if="job.prompt" :title="t('cron.card.promptPreview')" name="prompt">
        <pre class="whitespace-pre-wrap text-xs text-[var(--text-2)] bg-[var(--bg-elevate)] p-3 rounded font-mono leading-relaxed">{{ promptDisplay }}</pre>
        <p v-if="job.prompt.length > PROMPT_LIMIT" class="text-[11px] text-[var(--text-3)] mt-1">
          {{ t('cron.card.promptTruncated', { n: PROMPT_LIMIT }) }}
        </p>
      </NCollapseItem>

      <NCollapseItem
        v-if="runStats.count > 0"
        :title="t('cron.card.history.title', { n: runStats.count })"
        name="history"
      >
        <ul class="space-y-1 max-h-64 overflow-y-auto">
          <li
            v-for="s in jobSessions"
            :key="s.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-elevate)] transition-colors cursor-pointer text-xs"
            @click="openSession(s.id)"
          >
            <span class="font-mono text-[var(--text-3)] tabular-nums whitespace-nowrap">{{ fmtDateTime(s.updatedAt) }}</span>
            <span class="text-[var(--text-3)] opacity-50">·</span>
            <span class="text-[var(--text-2)] truncate flex-1" :title="s.title">{{ s.title || t('sessions.untitled') }}</span>
            <span class="text-[var(--text-3)] opacity-70 tabular-nums whitespace-nowrap">{{ s.messageCount }}{{ t('cron.card.history.msgSuffix') }}</span>
            <span class="text-[var(--text-3)] opacity-70 tabular-nums whitespace-nowrap">{{ fmtTokens(s.tokenTotal) }}</span>
          </li>
        </ul>
      </NCollapseItem>
    </NCollapse>
  </div>
</template>
