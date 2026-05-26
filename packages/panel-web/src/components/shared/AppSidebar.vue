<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCapabilitiesStore } from '@/stores/capabilities';

// AppSidebar is always rendered as a fixed left rail. The drawer-open prop
// is still accepted from DefaultLayout for backwards compatibility but
// is intentionally ignored — the user explicitly prefers a persistent
// sidebar over a hamburger drawer on every viewport.
defineProps<{
  drawerOpen?: boolean;
}>();

defineEmits<{
  (e: 'update:drawerOpen', v: boolean): void;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const collapsed = ref(false);
const caps = useCapabilitiesStore();

onMounted(() => { void caps.load(); });

interface MenuItem {
  key: string;
  iconPath: string;
  label: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
}

const icons = {
  dashboard: 'M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Zm12-2V5h4v14h-4ZM5 11V5h4v6H5Zm0 8v-2h4v2H5Z',
  chat: 'M4 4h16v12H7.5L4 19.5V4Zm2 2v8.7l.7-.7H18V6H6Zm3 3h6v2H9V9Zm0 3h4v2H9v-2Z',
  sessions: 'M5 3h14v18H5V3Zm2 2v14h10V5H7Zm2 3h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z',
  workspaces: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7ZM6 6v3h3V6H6Zm9 0v3h3V6h-3ZM6 15v3h3v-3H6Zm9 0v3h3v-3h-3Z',
  cron: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 3h-2v6l5 3 1-1.7-4-2.3V7Z',
  memory: 'M8 4a4 4 0 0 0-4 4v1.2A4 4 0 0 0 2 13a4 4 0 0 0 4 4h1v3h2v-3h6v3h2v-3h1a4 4 0 0 0 4-4 4 4 0 0 0-2-3.8V8a4 4 0 0 0-7.4-2.1A4 4 0 0 0 8 4Zm0 2a2 2 0 0 1 2 2h2a2 2 0 0 1 4 0v3h1a2 2 0 1 1 0 4H7a2 2 0 1 1 0-4h1V8a2 2 0 0 1 2-2Z',
  tools: 'M21 7.5 16.5 12l-2.5-2.5L18.5 5A5 5 0 0 0 12 11.5L4 19.5 5.5 21l8-8A5 5 0 0 0 20 6.5ZM5 5l3 3-1.5 1.5-3-3L5 5Zm13.5 13.5-3-3L17 14l3 3-1.5 1.5Z',
  developer: 'M8.6 16.6 4 12l4.6-4.6L10 8.8 6.8 12l3.2 3.2-1.4 1.4Zm6.8 0L14 15.2l3.2-3.2L14 8.8l1.4-1.4L20 12l-4.6 4.6ZM12.8 5l-3.6 14h2l3.6-14h-2Z',
  settings: 'M19.4 13.5a7.9 7.9 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8 8 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a7.9 7.9 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
} as const;

const items = computed<MenuItem[]>(() => [
  { key: 'dashboard', iconPath: icons.dashboard, label: t('nav.dashboard'), path: '/dashboard' },
  { key: 'chat', iconPath: icons.chat, label: t('nav.chat'), path: '/chat' },
  { key: 'sessions', iconPath: icons.sessions, label: t('nav.sessions'), path: '/sessions' },
  { key: 'workspaces', iconPath: icons.workspaces, label: t('nav.workspaces'), path: '/workspaces',
    disabled: !caps.has('profile'), disabledReason: 'Hermes profile not available' },
  { key: 'cron', iconPath: icons.cron, label: t('nav.cron'), path: '/cron',
    disabled: !caps.has('cron'), disabledReason: 'Hermes cron not available' },
  { key: 'memory', iconPath: icons.memory, label: t('nav.memory'), path: '/memory',
    disabled: !caps.has('memory'), disabledReason: 'No ~/.hermes/memories directory' },
  { key: 'tools', iconPath: icons.tools, label: t('nav.tools'), path: '/tools' },
  { key: 'developer', iconPath: icons.developer, label: t('nav.developer'), path: '/developer' },
  { key: 'settings', iconPath: icons.settings, label: t('nav.settings'), path: '/settings' },
]);

const groups = computed(() => [
  { key: 'main', label: 'MAIN', items: items.value.slice(0, 3) },
  { key: 'workspace', label: 'WORK', items: items.value.slice(3, 7) },
  { key: 'system', label: 'SYSTEM', items: items.value.slice(7) },
]);

function go(item: MenuItem): void {
  if (item.disabled) return;
  void router.push(item.path);
}

function isActive(path: string): boolean {
  return route.path === path || (path !== '/dashboard' && route.path.startsWith(`${path}/`));
}
</script>

<template>
  <aside
    class="app-sidebar h-full flex flex-col transition-[width] duration-200 flex-shrink-0 overflow-hidden"
    :class="collapsed ? 'w-[68px]' : 'w-[224px]'"
  >
    <div class="h-14 flex items-center px-4 gap-3 flex-shrink-0 border-b border-[var(--sidebar-border)]">
      <div class="w-8 h-8 rounded-md bg-[var(--sidebar-logo-bg)] shadow-[0_8px_18px_rgba(9,96,189,0.35)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        H
      </div>
      <div v-if="!collapsed" class="min-w-0">
        <div class="text-[15px] font-semibold text-white leading-5 truncate">Hermes Panel</div>
        <div class="text-[10px] text-[var(--sidebar-text-muted)] tracking-[0.16em] leading-4">CONTROL</div>
      </div>
    </div>

    <nav class="flex-1 min-h-0 px-2 py-2 overflow-hidden" aria-label="Primary navigation">
      <section v-for="group in groups" :key="group.key" class="mb-1">
        <div
          v-if="!collapsed"
          class="h-5 px-3 text-[10px] font-semibold tracking-[0.12em] text-[var(--sidebar-text-faint)] flex items-center"
        >
          {{ group.label }}
        </div>
        <button
          v-for="item in group.items"
          :key="item.key"
          class="sidebar-menu-item relative w-full h-9 flex items-center gap-3 px-3 mb-1 text-sm transition-colors text-left rounded-md"
          :class="[
            collapsed ? 'justify-center px-0' : '',
            isActive(item.path) ? 'is-active' : '',
            item.disabled ? 'is-disabled cursor-not-allowed' : 'cursor-pointer',
          ]"
          :disabled="item.disabled"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          :title="item.disabled ? (item.disabledReason ?? item.label) : item.label"
          @click="go(item)"
        >
          <span v-if="isActive(item.path)" class="active-rail" aria-hidden="true" />
          <svg
            class="w-[18px] h-[18px] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path :d="item.iconPath" />
          </svg>
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          <span v-if="!collapsed && item.disabled" class="ml-auto text-[10px] font-medium text-[var(--sidebar-text-faint)]">N/A</span>
        </button>
      </section>
    </nav>

    <button
      class="h-11 border-t border-[var(--sidebar-border)] flex items-center justify-center text-xs text-[var(--sidebar-text-muted)] hover:text-white hover:bg-white/5 flex-shrink-0 transition-colors"
      :title="collapsed ? 'Expand' : 'Collapse'"
      @click="collapsed = !collapsed"
    >
      <span class="text-base leading-none">{{ collapsed ? '>' : '<' }}</span>
    </button>
  </aside>
</template>
