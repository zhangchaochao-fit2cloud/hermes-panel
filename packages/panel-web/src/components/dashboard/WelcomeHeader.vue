<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { HealthStatus } from '@hermes-panel/shared';
import StatusBadge from '@/components/shared/StatusBadge.vue';

const props = defineProps<{
  health: HealthStatus | null;
  loading: boolean;
}>();

const { t, locale } = useI18n();
const now = ref(new Date());

let tickHandle: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  tickHandle = setInterval(() => { now.value = new Date(); }, 30_000);
});
onBeforeUnmount(() => {
  if (tickHandle) clearInterval(tickHandle);
});

const greeting = computed(() => {
  const hour = now.value.getHours();
  if (hour < 5)  return t('dashboard.greeting.lateNight');
  if (hour < 12) return t('dashboard.greeting.morning');
  if (hour < 18) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
});

const timeLabel = computed(() => {
  return now.value.toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const statusState = computed<'connected' | 'connecting' | 'disconnected' | 'unknown'>(() => {
  if (props.loading) return 'connecting';
  if (!props.health) return 'unknown';
  return props.health.hermes.running ? 'connected' : 'disconnected';
});

const statusLabel = computed(() => {
  if (props.loading) return t('status.connecting');
  if (!props.health) return t('status.connecting');
  return props.health.hermes.running
    ? `Hermes ${props.health.hermes.version ?? ''}`.trim()
    : t('error.hermes_not_found');
});
</script>

<template>
  <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ greeting }}
      </h1>
      <p class="mt-1 text-sm text-[var(--text-2)]">
        {{ timeLabel }}
      </p>
    </div>
    <StatusBadge :state="statusState" :label="statusLabel" />
  </header>
</template>
