<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCapabilitiesStore } from '@/stores/capabilities';

// AppSidebar is always rendered as a fixed left rail. The drawer-open prop
// is still accepted from DefaultLayout for backwards compatibility but
// is intentionally ignored — the user explicitly prefers a persistent
// sidebar over a hamburger drawer on every viewport.
const props = withDefaults(defineProps<{
  drawerOpen?: boolean;
  collapsed?: boolean;
}>(), {
  collapsed: false,
});

const emit = defineEmits<{
  (e: 'update:drawerOpen', v: boolean): void;
  (e: 'update:collapsed', v: boolean): void;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const caps = useCapabilitiesStore();
const isCollapsed = computed({
  get: () => props.collapsed,
  set: (value: boolean) => emit('update:collapsed', value),
});

onMounted(() => { void caps.load(); });

interface MenuItem {
  key: string;
  iconPath: string;
  label: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
  badge?: string;
  dot?: 'success' | 'warning';
}

interface MenuGroup {
  key: string;
  iconPath: string;
  label: string;
  path?: string;
  children?: MenuItem[];
  disabled?: boolean;
  disabledReason?: string;
  badge?: string;
  dot?: 'success' | 'warning';
}

const icons = {
  dashboard: 'M3 13h7V3H3v10Zm11 8h7V3h-7v18ZM3 21h7v-5H3v5Zm11 0h7v-5h-7v5Z',
  work: 'M4 6h16M4 12h16M4 18h16',
  system: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8c.18.6.66 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z',
  chat: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
  sessions: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  workspaces: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  cron: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  memory: 'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM6 8a3 3 0 0 0 0 6m12-6a3 3 0 0 1 0 6M9 18H7a3 3 0 0 1-3-3v-1m11 4h2a3 3 0 0 0 3-3v-1',
  tools: 'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z',
  developer: 'm8 18-6-6 6-6m8 0 6 6-6 6M14 4l-4 16',
  settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8c.18.6.66 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z',
} as const;

const items = computed<MenuItem[]>(() => [
  { key: 'dashboard', iconPath: icons.dashboard, label: t('nav.dashboard'), path: '/dashboard' },
  { key: 'chat', iconPath: icons.chat, label: t('nav.chat'), path: '/chat' },
  { key: 'sessions', iconPath: icons.sessions, label: t('nav.sessions'), path: '/sessions' },
  { key: 'workspaces', iconPath: icons.workspaces, label: t('nav.workspaces'), path: '/workspaces',
    disabled: !caps.has('profile'), disabledReason: t('nav.disabled.profile'), dot: caps.has('profile') ? 'success' : 'warning' },
  { key: 'cron', iconPath: icons.cron, label: t('nav.cron'), path: '/cron',
    disabled: !caps.has('cron'), disabledReason: t('nav.disabled.cron'), badge: caps.has('cron') ? undefined : t('nav.notAvailable') },
  { key: 'memory', iconPath: icons.memory, label: t('nav.memory'), path: '/memory',
    disabled: !caps.has('memory'), disabledReason: t('nav.disabled.memory'), badge: caps.has('memory') ? undefined : t('nav.notAvailable') },
  { key: 'tools', iconPath: icons.tools, label: t('nav.tools'), path: '/tools' },
  { key: 'developer', iconPath: icons.developer, label: t('nav.developer'), path: '/developer' },
  { key: 'settings', iconPath: icons.settings, label: t('nav.settings'), path: '/settings' },
]);

// Flat menu: user prefers a single level over the previous work/system grouping.
// We keep the MenuGroup shape so the rendering loop stays unchanged; each item
// is just a leaf (no children) and reuses its own path.
const expanded = ref<Record<string, boolean>>({});

const menuTree = computed<MenuGroup[]>(() =>
  items.value.map(i => ({
    key: i.key,
    iconPath: i.iconPath,
    label: i.label,
    path: i.path,
    disabled: i.disabled,
    disabledReason: i.disabledReason,
    badge: i.badge,
    dot: i.dot,
  })),
);

function navigateTo(path: string): void {
  if (route.path === path) return;
  void router.push(path).catch((err: unknown) => {
    console.error('[sidebar:navigate]', err);
  });
}

function go(item: MenuItem): void {
  if (item.disabled) return;
  navigateTo(item.path);
}

function isActive(path: string): boolean {
  return route.path === path || (path !== '/dashboard' && route.path.startsWith(`${path}/`));
}

function groupActive(group: MenuGroup): boolean {
  if (group.path) return isActive(group.path);
  return group.children?.some((item) => isActive(item.path)) ?? false;
}

function toggleGroup(group: MenuGroup): void {
  // Flat menu: groups with children no longer exist; every entry has a path.
  // Kept the function name so the existing template @click stays unchanged.
  if (group.disabled) return;
  if (group.path) {
    navigateTo(group.path);
    return;
  }
  if (group.children) {
    expanded.value[group.key] = !expanded.value[group.key];
  }
}
</script>

<template>
  <aside
    class="app-sidebar h-full flex flex-col transition-[width] duration-200 flex-shrink-0 overflow-hidden"
    :class="isCollapsed ? 'w-[68px] is-collapsed' : 'w-[248px]'"
  >
    <div class="sidebar-brand h-16 flex items-center px-4 gap-3 flex-shrink-0" data-tauri-drag-region>
      <div class="vben-logo-mark w-9 h-9 rounded-lg shadow-[var(--shadow-2)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        H
      </div>
      <div v-if="!isCollapsed" class="min-w-0">
        <div class="text-[19px] font-semibold text-[var(--text-1)] leading-6 truncate">Hermes Panel</div>
      </div>
    </div>

    <nav class="flex-1 min-h-0 px-3 py-4 overflow-hidden" aria-label="Primary navigation">
      <section v-for="group in menuTree" :key="group.key" class="mb-1">
        <button
          type="button"
          class="sidebar-menu-item sidebar-menu-parent relative w-full h-11 flex items-center gap-3 px-3 transition-colors text-left rounded-lg"
          :class="[
            isCollapsed ? 'justify-center px-0' : '',
            groupActive(group) ? 'is-active' : '',
            group.children && groupActive(group) ? 'is-parent-active' : '',
            group.disabled ? 'is-disabled cursor-not-allowed' : (group.path || group.children ? 'cursor-pointer' : ''),
          ]"
          :disabled="group.disabled"
          :aria-current="group.path && groupActive(group) ? 'page' : undefined"
          :aria-expanded="group.children ? expanded[group.key] : undefined"
          :title="group.disabled ? (group.disabledReason ?? group.label) : group.label"
          @click="toggleGroup(group)"
        >
          <svg
            class="w-[20px] h-[20px] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="group.iconPath" />
          </svg>
          <span v-if="!isCollapsed" class="truncate">{{ group.label }}</span>
          <template v-if="!isCollapsed">
            <span
              v-if="group.dot"
              class="ml-auto h-2.5 w-2.5 rounded-full"
              :class="group.dot === 'success' ? 'bg-emerald-400' : 'bg-rose-400'"
              aria-hidden="true"
            />
            <span v-else-if="group.badge" class="ml-auto sidebar-badge">{{ group.badge }}</span>
            <svg
              v-else-if="group.children"
              class="ml-auto h-4 w-4 transition-transform"
              :class="expanded[group.key] ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </template>
        </button>

        <div
          v-if="group.children"
          v-show="expanded[group.key] && !isCollapsed"
          class="mt-1 space-y-1"
        >
          <button
            v-for="item in group.children"
            :key="item.key"
            type="button"
            class="sidebar-menu-item sidebar-menu-child relative w-full h-10 flex items-center gap-3 pl-11 pr-3 transition-colors text-left rounded-lg"
            :class="[
              isActive(item.path) ? 'is-active' : '',
              item.disabled ? 'is-disabled cursor-not-allowed' : 'cursor-pointer',
            ]"
            :disabled="item.disabled"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :title="item.disabled ? (item.disabledReason ?? item.label) : item.label"
            @click="go(item)"
          >
            <svg
              class="w-[17px] h-[17px] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="item.iconPath" />
            </svg>
            <span class="truncate">{{ item.label }}</span>
            <span
              v-if="item.dot"
              class="ml-auto h-2.5 w-2.5 rounded-full"
              :class="item.dot === 'success' ? 'bg-emerald-400' : 'bg-rose-400'"
              aria-hidden="true"
            />
            <span v-else-if="item.badge" class="ml-auto sidebar-badge">{{ item.badge }}</span>
          </button>
        </div>
      </section>
    </nav>

  </aside>
</template>
