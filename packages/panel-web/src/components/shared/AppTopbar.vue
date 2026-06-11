<script setup lang="ts">
import { computed, h, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { NDropdown } from 'naive-ui';
import { useSystemStore } from '@/stores/system';
import { useAuthStore } from '@/stores/auth';
import { setLocale } from '@/locales';
import StatusBadge from './StatusBadge.vue';
import NotificationBell from './NotificationBell.vue';
import ModelSwitcher from './ModelSwitcher.vue';
import GlobalLoadingBar from './GlobalLoadingBar.vue';

defineProps<{
  sidebarCollapsed?: boolean;
}>();

const emit = defineEmits<{ (e: 'toggle-sidebar'): void }>();

const system = useSystemStore();
const auth = useAuthStore();
const { health, loading } = storeToRefs(system);
const { user } = storeToRefs(auth);
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const userInitial = computed(() => {
  const u = user.value;
  const src = u?.displayName || 'A';
  return src.trim().charAt(0).toUpperCase() || 'A';
});

const userMenuOptions = computed(() => {
  const u = user.value;
  const roleLabel = u?.role === 'admin' ? t('auth.admin') : t('auth.member');
  return [
    {
      key: 'header',
      type: 'render',
      render: () =>
        h('div', { class: 'px-3 py-2 min-w-[180px]' }, [
          h('div', { class: 'text-sm font-medium text-[var(--text-1)] truncate' }, u?.displayName || t('auth.account')),
          h('div', { class: 'text-xs text-[var(--text-3)] mt-0.5' }, roleLabel),
        ]),
    },
    { key: 'divider', type: 'divider' },
    { key: 'logout', label: t('auth.logout') },
  ];
});

async function onUserMenuSelect(key: string): Promise<void> {
  if (key === 'logout') {
    await auth.logout();
    void router.replace({ name: 'login' });
  }
}

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
    '/github': t('nav.subtitle.github'),
  };
  return map[route.path] ?? t('nav.subtitle.console');
});

function toggleLocale(): void {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN');
}

function showCheatsheet(): void {
  window.dispatchEvent(new Event('panel:show-cheatsheet'));
}

function openControlCenter(): void {
  window.dispatchEvent(new Event('panel:open-control-center'));
}
</script>

<template>
  <header
    class="app-topbar relative border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center gap-3 flex-shrink-0"
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
    <button
      type="button"
      class="topbar-command-button hidden lg:inline-flex"
      :title="t('controlCenter.openHint')"
      :aria-label="t('controlCenter.open')"
      @click="openControlCenter"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m21 21-4.3-4.3" />
        <circle cx="11" cy="11" r="7" />
      </svg>
      <span class="truncate">{{ t('controlCenter.open') }}</span>
      <kbd>⌘⇧P</kbd>
    </button>
    <button
      type="button"
      class="topbar-icon-button lg:hidden"
      :title="t('controlCenter.openHint')"
      :aria-label="t('controlCenter.open')"
      @click="openControlCenter"
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
        <path d="m21 21-4.3-4.3" />
        <circle cx="11" cy="11" r="7" />
      </svg>
    </button>
    <ModelSwitcher />
    <StatusBadge :state="hermesState" :label="hermesLabel" />
    <NotificationBell />
    <NDropdown
      v-if="user"
      trigger="click"
      :options="userMenuOptions"
      @select="onUserMenuSelect"
    >
      <button
        type="button"
        class="topbar-user-button"
        :title="user.displayName ?? t('auth.account')"
        :aria-label="t('auth.account')"
      >
        {{ userInitial }}
      </button>
    </NDropdown>
    <button
      type="button"
      class="topbar-icon-button"
      :title="t('hotkeysCheatsheet.title') + ' (⌘?)'"
      :aria-label="t('hotkeysCheatsheet.title')"
      @click="showCheatsheet"
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
        <path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.6.6-1.4 1-1.9 1.4-.5.4-.5.9-.5 1.5" />
        <path d="M12 17h.01" />
      </svg>
    </button>
    <button
      type="button"
      class="topbar-icon-button relative"
      :title="t('common.switchLocale')"
      :aria-label="t('common.switchLocale')"
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
        {{ t('common.localeIndicator') }}
      </span>
    </button>
    <GlobalLoadingBar />
  </header>
</template>

<style scoped src="./AppTopbar.css"></style>
