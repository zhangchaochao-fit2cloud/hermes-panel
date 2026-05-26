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
  icon: string;
  label: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
}

const items = computed<MenuItem[]>(() => [
  { key: 'dashboard', icon: '📊', label: t('nav.dashboard'), path: '/dashboard' },
  { key: 'chat', icon: '💬', label: t('nav.chat'), path: '/chat' },
  { key: 'sessions', icon: '📜', label: t('nav.sessions'), path: '/sessions' },
  { key: 'workspaces', icon: '🧩', label: t('nav.workspaces'), path: '/workspaces',
    disabled: !caps.has('profile'), disabledReason: 'Hermes profile not available' },
  { key: 'cron', icon: '⏰', label: t('nav.cron'), path: '/cron',
    disabled: !caps.has('cron'), disabledReason: 'Hermes cron not available' },
  { key: 'memory', icon: '🧠', label: t('nav.memory'), path: '/memory',
    disabled: !caps.has('memory'), disabledReason: 'No ~/.hermes/memories directory' },
  { key: 'tools', icon: '🛠', label: t('nav.tools'), path: '/tools' },
  { key: 'developer', icon: '🔧', label: t('nav.developer'), path: '/developer' },
  { key: 'settings', icon: '⚙️', label: t('nav.settings'), path: '/settings' },
]);

function go(item: MenuItem): void {
  if (item.disabled) return;
  void router.push(item.path);
}
</script>

<template>
  <aside
    class="h-full border-r border-[var(--border)] bg-[var(--bg-card)] flex flex-col transition-all duration-200 flex-shrink-0"
    :class="collapsed ? 'w-[64px]' : 'w-[220px]'"
  >
    <!-- Logo area -->
    <div class="h-16 flex items-center px-4 border-b border-[var(--border)] gap-2">
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        H
      </div>
      <div v-if="!collapsed" class="text-sm font-semibold whitespace-nowrap">Hermes Panel</div>
    </div>

    <!-- Menu — fixed (no overflow), 9 items fit in any sane viewport -->
    <nav class="flex-1 min-h-0 py-3">
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
        :title="item.disabled ? (item.disabledReason ?? item.label) : item.label"
        @click="go(item)"
      >
        <span class="text-base flex-shrink-0">{{ item.icon }}</span>
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        <span v-if="!collapsed && item.disabled" class="ml-auto text-[10px] opacity-60">N/A</span>
      </button>
    </nav>

    <!-- Collapse toggle (icon only when collapsed) -->
    <button
      class="h-10 border-t border-[var(--border)] flex items-center justify-center text-xs opacity-60 hover:opacity-100 hover:bg-[var(--bg-elevate)]"
      :title="collapsed ? 'Expand' : 'Collapse'"
      @click="collapsed = !collapsed"
    >
      {{ collapsed ? '»' : '«' }}
    </button>
  </aside>
</template>
