<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton, useDialog, useMessage } from 'naive-ui';
import { useSystemStore } from '@/stores/system';
import { useGatewayStore } from '@/stores/gateway';

const { t } = useI18n();
const dialog = useDialog();
const message = useMessage();

const system = useSystemStore();
const gateway = useGatewayStore();
const { health, loading: systemLoading } = storeToRefs(system);
const { starting, stopping } = storeToRefs(gateway);

// Whether the gateway is reachable. While we don't yet have a health
// snapshot we treat it as unknown so the button doesn't flicker between
// "Start" and "Stop" on first paint.
const running = computed<boolean | null>(() => {
  if (!health.value) return null;
  return health.value.hermes.running;
});

const busy = computed(() => starting.value || stopping.value);

// After a start/stop, the actual port state can lag by 1–3 seconds. Poll
// the health endpoint every 2s for up to 10s so the badge & button track
// reality without making the user spam refresh.
let pollHandle: ReturnType<typeof setInterval> | null = null;
let pollDeadline = 0;

function stopPoll(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

function startPoll(targetRunning: boolean): void {
  stopPoll();
  pollDeadline = Date.now() + 10_000;
  pollHandle = setInterval(() => {
    void system.refresh().then(() => {
      if (health.value?.hermes.running === targetRunning) {
        stopPoll();
        return;
      }
      if (Date.now() >= pollDeadline) stopPoll();
    });
  }, 2_000);
}

onBeforeUnmount(() => stopPoll());

const lastError = ref<string | null>(null);

async function onStart(): Promise<void> {
  lastError.value = null;
  const ok = await gateway.start();
  if (ok) {
    message.success(t('system.gateway.startedToast'));
    startPoll(true);
  } else {
    lastError.value = gateway.error ?? 'start failed';
    message.error(lastError.value);
  }
}

function onStopClick(): void {
  dialog.warning({
    title: t('system.gateway.confirmStopTitle'),
    content: t('system.gateway.confirmStopContent'),
    positiveText: t('system.gateway.stop'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      lastError.value = null;
      const ok = await gateway.stop();
      if (ok) {
        message.success(t('system.gateway.stoppedToast'));
        startPoll(false);
      } else {
        lastError.value = gateway.error ?? 'stop failed';
        message.error(lastError.value);
      }
    },
  });
}

const buttonLabel = computed(() => {
  if (starting.value) return t('system.gateway.starting');
  if (stopping.value) return t('system.gateway.stopping');
  if (running.value) return t('system.gateway.stop');
  return t('system.gateway.start');
});
</script>

<template>
  <div class="gateway-control inline-flex items-center gap-2">
    <NButton
      v-if="running === true"
      size="small"
      type="error"
      :loading="busy"
      :disabled="busy || systemLoading"
      @click="onStopClick"
    >
      {{ buttonLabel }}
    </NButton>
    <NButton
      v-else-if="running === false"
      size="small"
      type="success"
      :loading="busy"
      :disabled="busy || systemLoading"
      @click="onStart"
    >
      {{ buttonLabel }}
    </NButton>
    <NButton
      v-else
      size="small"
      tertiary
      :disabled="true"
    >
      {{ t('system.gateway.checking') }}
    </NButton>
  </div>
</template>
