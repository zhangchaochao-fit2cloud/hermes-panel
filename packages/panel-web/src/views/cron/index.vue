<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { NSkeleton, useDialog, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/shared/EmptyState.vue';
import CronStatusBar from '@/components/cron/CronStatusBar.vue';
import CronCard from '@/components/cron/CronCard.vue';
import { useCronStore, type CronJob } from '@/stores/cron';

const { t } = useI18n();
const store = useCronStore();
const message = useMessage();
const dialog = useDialog();

const { jobs, loading, refreshing, initialized, error, total, activeCount, earliestNextRun } = storeToRefs(store);

const isEmpty = computed(() => initialized.value && !loading.value && jobs.value.length === 0);
const showInitialSkeleton = computed(() => loading.value && !initialized.value);

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void store.load({ initial: true });
  // Light periodic refresh so nextRun stays accurate without manual reloads.
  pollTimer = setInterval(() => {
    if (!document.hidden) void store.load();
  }, 30_000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
});

function onCreate(): void {
  dialog.info({
    title: t('cron.create.placeholderTitle'),
    content: () => t('cron.create.placeholderContent'),
    positiveText: t('common.confirm'),
  });
}

function onRefresh(): void {
  void store.load();
}

async function onPause(id: string): Promise<void> {
  const ok = await store.pause(id);
  if (ok) message.success(t('cron.toast.paused'));
  else message.error(t('cron.toast.actionFailed'));
}

async function onResume(id: string): Promise<void> {
  const ok = await store.resume(id);
  if (ok) message.success(t('cron.toast.resumed'));
  else message.error(t('cron.toast.actionFailed'));
}

async function onRun(id: string): Promise<void> {
  const ok = await store.runNow(id);
  if (ok) message.success(t('cron.toast.triggered'));
  else message.error(t('cron.toast.actionFailed'));
}

async function onRemove(job: CronJob): Promise<void> {
  const ok = await store.remove(job.id);
  if (ok) message.success(t('cron.toast.removed', { name: job.name || job.id }));
  else message.error(t('cron.toast.actionFailed'));
}
</script>

<template>
  <div class="flex flex-col min-h-full bg-[var(--bg-page)]">
    <CronStatusBar
      :total="total"
      :active="activeCount"
      :earliest-next-run="earliestNextRun"
      :refreshing="refreshing"
      @create="onCreate"
      @refresh="onRefresh"
    />

    <div class="relative h-[1px] bg-transparent overflow-hidden">
      <div
        v-if="refreshing"
        class="absolute inset-y-0 left-0 h-full bg-[var(--brand-500)] animate-progress"
      />
    </div>

    <div
      v-if="error"
      class="px-6 py-2 text-xs bg-red-500/10 text-red-600 border-b border-red-500/30"
    >
      {{ error }}
      <button
        class="ml-2 underline opacity-80 hover:opacity-100"
        @click="store.load({ initial: true })"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-auto px-6 py-4">
      <div v-if="showInitialSkeleton" class="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <NSkeleton v-for="i in 4" :key="i" :height="180" />
      </div>

      <EmptyState
        v-else-if="isEmpty"
        icon="⏰"
        :title="t('cron.empty.title')"
        :subtitle="t('cron.empty.subtitle')"
      >
        <div class="mt-3 inline-block text-left">
          <p class="text-xs text-[var(--text-3)] mb-1">{{ t('cron.empty.hint') }}</p>
          <pre class="text-xs font-mono bg-[var(--bg-elevate)] px-3 py-2 rounded border border-[var(--border)]">hermes cron add --schedule "0 9 * * *" --prompt "..."</pre>
        </div>
      </EmptyState>

      <div v-else-if="initialized" class="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <CronCard
          v-for="job in jobs"
          :key="job.id"
          :job="job"
          @pause="onPause"
          @resume="onResume"
          @run="onRun"
          @remove="onRemove"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-slide {
  0% {
    width: 0%;
    transform: translateX(0%);
  }
  50% {
    width: 50%;
    transform: translateX(50%);
  }
  100% {
    width: 0%;
    transform: translateX(200%);
  }
}
.animate-progress {
  animation: progress-slide 1.2s ease-in-out infinite;
}
</style>
