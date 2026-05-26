<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import { setLocale } from '@/locales';
import StatusBadge from './StatusBadge.vue';
import NotificationBell from './NotificationBell.vue';

// Backwards-compat emit; no longer wired now that the sidebar is always
// rendered as a fixed left rail.
defineEmits<{ (e: 'toggle-sidebar'): void }>();

const system = useSystemStore();
const { health, loading } = storeToRefs(system);
const { t, locale } = useI18n();
const route = useRoute();

let pollHandle: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (!health.value) await system.refresh();
  pollHandle = setInterval(() => {
    void system.refresh();
  }, 10_000);
});

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle);
});

const hermesState = computed<'connected' | 'connecting' | 'disconnected' | 'unknown'>(() => {
  if (loading.value) return 'connecting';
  if (!health.value) return 'unknown';
  return health.value.hermes.running ? 'connected' : 'disconnected';
});

const hermesLabel = computed(() => {
  if (loading.value) return t('status.connecting');
  if (!health.value) return t('status.connecting');
  return health.value.hermes.running
    ? `Hermes ${health.value.hermes.version ?? 'unknown'}`
    : t('error.hermes_not_found');
});

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/dashboard': t('nav.dashboard'),
    '/chat': t('nav.chat'),
    '/sessions': t('nav.sessions'),
    '/workspaces': t('nav.workspaces'),
    '/cron': t('nav.cron'),
    '/memory': t('nav.memory'),
    '/tools': t('nav.tools'),
    '/developer': t('nav.developer'),
    '/settings': t('nav.settings'),
  };
  return map[route.path] ?? '';
});

const pageSubtitle = computed(() => {
  const map: Record<string, string> = {
    '/dashboard': 'Overview',
    '/chat': 'Conversation',
    '/sessions': 'History',
    '/workspaces': 'Profiles',
    '/cron': 'Automation',
    '/memory': 'Knowledge',
    '/tools': 'Integrations',
    '/developer': 'Diagnostics',
    '/settings': 'Preferences',
  };
  return map[route.path] ?? 'Console';
});

function toggleLocale(): void {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN');
}
</script>

<template>
  <header class="app-topbar h-14 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center px-5 gap-4 flex-shrink-0">
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-[11px] text-[var(--text-3)] leading-4">
        <span>Hermes</span>
        <span class="text-[var(--text-3)]">/</span>
        <span>{{ pageSubtitle }}</span>
      </div>
      <h1 v-if="pageTitle" class="text-[15px] font-semibold leading-5 truncate text-[var(--text-1)]">{{ pageTitle }}</h1>
    </div>
    <div class="flex-1" />
    <StatusBadge :state="hermesState" :label="hermesLabel" />
    <NotificationBell />
    <button
      class="h-8 min-w-10 px-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] text-xs font-medium text-[var(--text-2)] hover:text-[var(--brand-600)] hover:border-[var(--brand-500)] transition-colors"
      :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'"
      @click="toggleLocale"
    >
      {{ locale === 'zh-CN' ? '中 / EN' : 'EN / 中' }}
    </button>
  </header>
</template>
