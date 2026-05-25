<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const collapsed = ref(false);

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  path: string;
  disabled?: boolean;
}

const items = computed<MenuItem[]>(() => [
  { key: 'dashboard', icon: '📊', label: t('nav.dashboard'), path: '/dashboard' },
  { key: 'chat', icon: '💬', label: t('nav.chat'), path: '/chat' },
  { key: 'sessions', icon: '📜', label: t('nav.sessions'), path: '/sessions' },
  { key: 'workspaces', icon: '🧩', label: 'Workspaces', path: '/workspaces', disabled: true },
  { key: 'tools', icon: '🛠', label: t('nav.tools'), path: '/tools' },
  { key: 'settings', icon: '⚙️', label: t('nav.settings'), path: '/settings' },
]);

function go(item: MenuItem): void {
  if (item.disabled) return;
  router.push(item.path);
}
</script>

<template>
  <aside
    class="h-full border-r border-[var(--border)] bg-[var(--bg-card)] flex flex-col transition-all duration-200"
    :class="collapsed ? 'w-[64px]' : 'w-[220px]'"
  >
    <!-- Logo area -->
    <div class="h-16 flex items-center px-4 border-b border-[var(--border)] gap-2">
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        H
      </div>
      <div v-if="!collapsed" class="text-sm font-semibold">Hermes Panel</div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-3">
      <button
        v-for="item in items"
        :key="item.key"
        class="w-full flex items-center gap-3 px-3 py-2 mb-0.5 text-sm transition-colors text-left"
        :class="[
          collapsed ? 'justify-center' : '',
          route.path === item.path
            ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-l-2 border-[var(--brand-500)]'
            : 'border-l-2 border-transparent hover:bg-[var(--bg-elevate)]',
          item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ]"
        :disabled="item.disabled"
        :title="item.label + (item.disabled ? ' (coming in next plan)' : '')"
        @click="go(item)"
      >
        <span class="text-base flex-shrink-0">{{ item.icon }}</span>
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        <span v-if="!collapsed && item.disabled" class="ml-auto text-[10px] opacity-60">soon</span>
      </button>
    </nav>

    <!-- Collapse toggle -->
    <button
      class="h-10 border-t border-[var(--border)] flex items-center justify-center text-xs opacity-60 hover:opacity-100 hover:bg-[var(--bg-elevate)]"
      @click="collapsed = !collapsed"
    >
      {{ collapsed ? '»' : '«' }}
    </button>
  </aside>
</template>
