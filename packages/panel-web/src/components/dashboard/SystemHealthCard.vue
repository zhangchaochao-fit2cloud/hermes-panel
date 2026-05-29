<script setup lang="ts">
/**
 * Compact "system health" card for the Dashboard.
 *
 * Renders 4 dependency dots:
 *  - Hermes API (from useSystemStore().health.hermes)
 *  - Gateway    (from /api/gateway/status, polled every 15s)
 *  - BFF        (from useSystemStore().health.bff — uptimeSec > 0 means up)
 *  - Hermes CLI (derived: if health response has a `hermes` block at all,
 *                the BFF was able to exec the CLI — so CLI is reachable.)
 *
 * The card itself is a button that jumps to /developer#doctor so the
 * developer view can deep-link to the Doctor tab.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import { bffFetch } from '@/api/bff';

type DotState = 'ok' | 'pending' | 'down' | 'unknown';

interface GatewayStatusResult {
  running: boolean;
  pid?: number;
  raw?: string;
}

const { t } = useI18n();
const router = useRouter();
const system = useSystemStore();
const { health, loading: systemLoading } = storeToRefs(system);

// Gateway status — polled here because the dashboard is the only place
// that needs the boolean at a glance. 15s feels right: gateway transitions
// are user-driven (start/stop button) and recover within a few seconds.
const gatewayRunning = ref<boolean | null>(null);
const gatewayLoading = ref(true);
const gatewayError = ref(false);

let gwTimer: ReturnType<typeof setInterval> | null = null;

async function refreshGateway(silent = false): Promise<void> {
  if (!silent) gatewayLoading.value = true;
  try {
    const s = await bffFetch<GatewayStatusResult>('/api/gateway/status', { silent: true });
    gatewayRunning.value = s.running;
    gatewayError.value = false;
  } catch {
    gatewayRunning.value = null;
    gatewayError.value = true;
  } finally {
    if (!silent) gatewayLoading.value = false;
  }
}

onMounted(() => {
  void refreshGateway();
  gwTimer = setInterval(() => void refreshGateway(true), 15_000);
});

onUnmounted(() => {
  if (gwTimer) clearInterval(gwTimer);
});

// ---- Row state derivations ----

const hermesState = computed<DotState>(() => {
  if (systemLoading.value && !health.value) return 'pending';
  if (!health.value) return 'unknown';
  return health.value.hermes.running ? 'ok' : 'down';
});

const gatewayState = computed<DotState>(() => {
  if (gatewayLoading.value && gatewayRunning.value === null) return 'pending';
  if (gatewayError.value || gatewayRunning.value === null) return 'unknown';
  return gatewayRunning.value ? 'ok' : 'down';
});

const bffState = computed<DotState>(() => {
  // BFF replied to /api/system/health (otherwise health would be null).
  // uptimeSec > 0 confirms the BFF reported its own state.
  if (!health.value) return systemLoading.value ? 'pending' : 'unknown';
  return health.value.bff.uptimeSec >= 0 ? 'ok' : 'down';
});

const cliState = computed<DotState>(() => {
  // If health.hermes block exists (regardless of running), the BFF was
  // able to consult the CLI. If health is missing entirely we can't tell.
  if (!health.value) return systemLoading.value ? 'pending' : 'unknown';
  return health.value.hermes !== undefined ? 'ok' : 'down';
});

// ---- Row details (single-line subtitles) ----

function formatUptimeShort(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${s}s`;
}

const hermesDetail = computed(() => {
  const v = health.value?.hermes.version;
  if (v) {
    // Versions arrive as "Hermes Agent v0.8.0 (2026.4.8)". Trim the
    // trailing build-date parens so the line stays compact.
    return v.replace(/\s*\([^)]*\)\s*$/, '');
  }
  if (hermesState.value === 'down') return t('dashboard.health.statusDown');
  if (hermesState.value === 'pending') return t('dashboard.health.statusUnknown');
  return t('dashboard.health.statusUnknown');
});

const gatewayDetail = computed(() => {
  if (gatewayState.value === 'ok') return t('dashboard.health.statusOk');
  if (gatewayState.value === 'down') return t('dashboard.health.statusDown');
  return t('dashboard.health.statusUnknown');
});

const bffDetail = computed(() => {
  const sec = health.value?.bff.uptimeSec;
  if (typeof sec === 'number' && Number.isFinite(sec) && sec >= 0) {
    return `${t('dashboard.health.uptime')} ${formatUptimeShort(sec)}`;
  }
  return t('dashboard.health.statusUnknown');
});

const cliDetail = computed(() => {
  if (cliState.value === 'ok') return t('dashboard.health.available');
  if (cliState.value === 'down') return t('dashboard.health.unavailable');
  return t('dashboard.health.statusUnknown');
});

const rows = computed(() => [
  { name: t('dashboard.health.hermes'),  state: hermesState.value,  detail: hermesDetail.value  },
  { name: t('dashboard.health.gateway'), state: gatewayState.value, detail: gatewayDetail.value },
  { name: t('dashboard.health.bff'),     state: bffState.value,     detail: bffDetail.value     },
  { name: t('dashboard.health.cli'),     state: cliState.value,     detail: cliDetail.value     },
]);

const DOT_CLASS: Record<DotState, string> = {
  ok:      'status-dot-success',
  pending: 'status-dot-warning animate-pulse',
  down:    'status-dot-error',
  unknown: 'status-dot-neutral opacity-70',
};

function onOpen(): void {
  void router.push({ path: '/developer', hash: '#doctor' });
}
</script>

<template>
  <button
    type="button"
    class="text-left w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)] cursor-pointer"
    :aria-label="t('dashboard.health.title')"
    @click="onOpen"
  >
    <div class="flex items-center justify-between">
      <div class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
        {{ t('dashboard.health.title') }}
      </div>
      <div class="h-2 w-2 rounded-full" :style="{ background: 'var(--brand-500)' }" />
    </div>

    <ul class="mt-3 flex flex-col gap-2">
      <li
        v-for="row in rows"
        :key="row.name"
        class="flex items-center gap-2 min-w-0"
      >
        <span
          class="inline-block h-2 w-2 rounded-full shrink-0"
          :class="DOT_CLASS[row.state]"
        />
        <span class="text-sm font-medium text-[var(--text-1)] truncate">
          {{ row.name }}
        </span>
        <span class="ml-auto text-xs text-[var(--text-3)] truncate">
          {{ row.detail }}
        </span>
      </li>
    </ul>
  </button>
</template>
