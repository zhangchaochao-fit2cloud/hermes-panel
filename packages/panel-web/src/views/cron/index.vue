<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useMessage } from 'naive-ui';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/shared/EmptyState.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import CronStatusBar from '@/components/cron/CronStatusBar.vue';
import CronCard from '@/components/cron/CronCard.vue';
import CreateJobModal from '@/components/cron/CreateJobModal.vue';
import { useCronStore, type CronJob } from '@/stores/cron';

const { t } = useI18n();
const store = useCronStore();
const message = useMessage();

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

  // 检查是否从 chat 跳过来要求新建任务，是的话打开 modal 并预填 prompt
  try {
    const pending = sessionStorage.getItem('panel.pendingCronPrompt');
    if (pending) {
      pendingPrompt.value = pending;
      createModalOpen.value = true;
      sessionStorage.removeItem('panel.pendingCronPrompt');
    }
  } catch { /* ignore */ }
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
});

const createModalOpen = ref(false);
const pendingPrompt = ref<string>('');

function onCreate(): void {
  createModalOpen.value = true;
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
  <ViewErrorBoundary name="cron">
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

    <ErrorBanner
      v-if="error"
      :message="error"
      :retry-label="t('common.retry')"
      @retry="store.load({ initial: true })"
    />

    <div class="flex-1 min-h-0 px-6 py-4">
      <div v-if="showInitialSkeleton" class="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ThemedSkeleton :repeat="4" height="180px" />
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

    <CreateJobModal v-model:show="createModalOpen" :initial-prompt="pendingPrompt" />
  </div>
  </ViewErrorBoundary>
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
