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

function toggleLocale(): void {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN');
}
</script>

<template>
  <header class="h-16 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center px-6 gap-4 flex-shrink-0">
    <h1 v-if="pageTitle" class="text-base font-medium truncate">{{ pageTitle }}</h1>
    <div class="flex-1" />
    <StatusBadge :state="hermesState" :label="hermesLabel" />
    <NotificationBell />
    <button
      class="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevate)] opacity-70 hover:opacity-100"
      :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'"
      @click="toggleLocale"
    >
      🌐 {{ locale === 'zh-CN' ? '中' : 'EN' }}
    </button>
  </header>
</template>
