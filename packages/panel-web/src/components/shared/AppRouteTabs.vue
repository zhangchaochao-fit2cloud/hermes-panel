<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// Same icon set as AppSidebar so the two stay visually consistent.
const ICONS = {
  dashboard:  'M3 13h7V3H3v10Zm11 8h7V3h-7v18ZM3 21h7v-5H3v5Zm11 0h7v-5h-7v5Z',
  chat:       'M21 12a8 8 0 0 1-12 6.9L4 21l1.1-4.1A8 8 0 1 1 21 12Z',
  sessions:   'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  workspaces: 'M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',
  cron:       'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  memory:     'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM6 8a3 3 0 0 0 0 6m12-6a3 3 0 0 1 0 6M9 18H7a3 3 0 0 1-3-3v-1m11 4h2a3 3 0 0 0 3-3v-1',
  tools:      'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z',
  developer:  'm8 18-6-6 6-6m8 0 6 6-6 6M14 4l-4 16',
  settings:   'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8c.18.6.66 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z',
} as const;

const tabs = computed(() => [
  { path: '/dashboard',  label: t('nav.dashboard'),  iconPath: ICONS.dashboard,  pinned: true },
  { path: '/chat',       label: t('nav.chat'),       iconPath: ICONS.chat },
  { path: '/sessions',   label: t('nav.sessions'),   iconPath: ICONS.sessions },
  { path: '/workspaces', label: t('nav.workspaces'), iconPath: ICONS.workspaces },
  { path: '/cron',       label: t('nav.cron'),       iconPath: ICONS.cron },
  { path: '/memory',     label: t('nav.memory'),     iconPath: ICONS.memory },
  { path: '/tools',      label: t('nav.tools'),      iconPath: ICONS.tools },
  { path: '/developer',  label: t('nav.developer'),  iconPath: ICONS.developer },
  { path: '/settings',   label: t('nav.settings'),   iconPath: ICONS.settings },
]);

function isActive(path: string): boolean {
  return route.path === path || (path !== '/dashboard' && route.path.startsWith(`${path}/`));
}

function go(path: string): void {
  if (isActive(path)) return;
  void router.push(path).catch((err: unknown) => {
    console.error('[tabs:navigate]', err);
  });
}
</script>

<template>
  <div class="app-route-tabs flex h-11 items-end overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-card)] px-3">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="route-tab mb-0 flex h-9 shrink-0 items-center gap-2 rounded-t-lg border border-transparent px-4 text-sm transition-colors"
      :class="isActive(tab.path) ? 'is-active' : ''"
      :aria-current="isActive(tab.path) ? 'page' : undefined"
      @click="go(tab.path)"
    >
      <svg
        class="h-4 w-4 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="tab.iconPath" />
      </svg>
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>
