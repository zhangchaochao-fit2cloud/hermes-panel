<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import { setLocale } from '@/locales';
import StatusBadge from './StatusBadge.vue';
import NotificationBell from './NotificationBell.vue';
import ModelSwitcher from './ModelSwitcher.vue';

defineProps<{
  sidebarCollapsed?: boolean;
}>();

const emit = defineEmits<{ (e: 'toggle-sidebar'): void }>();

const system = useSystemStore();
const { health, loading } = storeToRefs(system);
const { t, locale } = useI18n();
const route = useRoute();

let pollHandle: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (!health.value) await system.refresh();
  pollHandle = setInterval(() => {
    void system.refresh({ silent: true });
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
  if (!health.value.hermes.running) return t('error.hermes_not_found');
  const raw = health.value.hermes.version;
  if (!raw) return 'Hermes';
  // raw is like "Hermes Agent v0.8.0 (2026.4.8)". Strip the trailing
  // build-date parens and use the version line as-is (it already starts
  // with "Hermes …", so prefixing another "Hermes" would duplicate).
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
});

const pageSubtitle = computed(() => {
  const map: Record<string, string> = {
    '/dashboard': t('nav.subtitle.dashboard'),
    '/chat': t('nav.subtitle.chat'),
    '/sessions': t('nav.subtitle.sessions'),
    '/workspaces': t('nav.subtitle.workspaces'),
    '/cron': t('nav.subtitle.cron'),
    '/memory': t('nav.subtitle.memory'),
    '/tools': t('nav.subtitle.tools'),
    '/developer': t('nav.subtitle.developer'),
    '/settings': t('nav.subtitle.settings'),
  };
  return map[route.path] ?? t('nav.subtitle.console');
});

function toggleLocale(): void {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN');
}
</script>

<template>
  <header
    class="app-topbar border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center gap-3 flex-shrink-0"
    data-tauri-drag-region
  >
    <button
      type="button"
      class="topbar-icon-button"
      :title="t('common.menu')"
      @click="emit('toggle-sidebar')"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h12M4 18h16" />
      </svg>
    </button>
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-[13px] text-[var(--text-2)] leading-5">
        <span>Hermes</span>
        <svg class="h-3.5 w-3.5 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span class="text-[var(--brand-600)]">{{ pageSubtitle }}</span>
      </div>
    </div>
    <div class="flex-1" />
    <ModelSwitcher />
    <StatusBadge :state="hermesState" :label="hermesLabel" />
    <NotificationBell />
    <button
      type="button"
      class="topbar-icon-button relative"
      :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'"
      :aria-label="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'"
      @click="toggleLocale"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 0 20a15.3 15.3 0 0 1 0-20Z" />
      </svg>
      <span
        class="absolute bottom-0 right-0 text-[9px] font-bold leading-none px-1 rounded-sm bg-[var(--bg-card)] text-[var(--brand-600)] ring-1 ring-[var(--border)]"
        aria-hidden="true"
      >
        {{ locale === 'zh-CN' ? '中' : 'EN' }}
      </span>
    </button>
  </header>
</template>
