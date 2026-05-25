<script setup lang="ts">
import { computed, h, ref } from 'vue';
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
import {
  fmtDateTime,
  fmtTime,
  humanizeGap,
  nextRuns,
  tsToMs,
} from '@/utils/cron-helpers';

const props = defineProps<{ job: CronJob }>();

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
            :class="job.active ? 'bg-emerald-500' : 'bg-[var(--text-3)] opacity-60'"
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
            <NButton size="tiny" quaternary circle @click="emit('pause', job.id)">⏸</NButton>
          </template>
          {{ t('cron.card.actions.pause') }}
        </NTooltip>
        <NTooltip v-else trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary circle type="primary" @click="emit('resume', job.id)">▶</NButton>
          </template>
          {{ t('cron.card.actions.resume') }}
        </NTooltip>
        <NTooltip v-if="job.active" trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary @click="emit('run', job.id)">
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
          :class="lastResultIsOk ? 'text-emerald-500' : lastResultIsFail ? 'text-red-500' : 'opacity-70'"
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
                :class="lastResultIsOk ? 'text-emerald-500' : lastResultIsFail ? 'text-red-500' : 'opacity-60'"
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

    <!-- prompt preview (collapsible) -->
    <NCollapse v-if="job.prompt" arrow-placement="right" :default-expanded-names="[]">
      <NCollapseItem :title="t('cron.card.promptPreview')" name="prompt">
        <pre class="whitespace-pre-wrap text-xs text-[var(--text-2)] bg-[var(--bg-elevate)] p-3 rounded font-mono leading-relaxed">{{ promptDisplay }}</pre>
        <p v-if="job.prompt.length > PROMPT_LIMIT" class="text-[11px] text-[var(--text-3)] mt-1">
          {{ t('cron.card.promptTruncated', { n: PROMPT_LIMIT }) }}
        </p>
      </NCollapseItem>
    </NCollapse>
  </div>
</template>
