<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NDrawer, NDrawerContent } from 'naive-ui';
import { useCapabilitiesStore } from '@/stores/capabilities';
import { useBreakpoint } from '@/composables/use-breakpoint';

const props = defineProps<{
  /**
   * Externally-controlled drawer visibility (mobile only). DefaultLayout owns
   * this so the hamburger button in AppTopbar can toggle it.
   */
  drawerOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:drawerOpen', v: boolean): void;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const collapsed = ref(false);
const caps = useCapabilitiesStore();
const { isMobile } = useBreakpoint();

onMounted(() => { void caps.load(); });

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
}

const items = computed<MenuItem[]>(() => {
  return [
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
  ];
});

function go(item: MenuItem): void {
  if (item.disabled) return;
  void router.push(item.path);
  // Auto-close mobile drawer once a menu item is chosen.
  if (isMobile.value && props.drawerOpen) {
    emit('update:drawerOpen', false);
  }
}

// Whenever we cross the mobile threshold while the drawer is open, close it
// so we don't leave dangling overlay state on the desktop layout.
watch(isMobile, (m) => {
  if (!m && props.drawerOpen) emit('update:drawerOpen', false);
});

function onDrawerUpdate(v: boolean): void {
  emit('update:drawerOpen', v);
}
</script>

<template>
  <!-- Desktop sidebar (>= 768px) -->
  <aside
    v-if="!isMobile"
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
        :title="item.disabled ? (item.disabledReason ?? item.label) : item.label"
        @click="go(item)"
      >
        <span class="text-base flex-shrink-0">{{ item.icon }}</span>
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        <span v-if="!collapsed && item.disabled" class="ml-auto text-[10px] opacity-60">N/A</span>
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

  <!-- Mobile drawer (< 768px) -->
  <NDrawer
    v-else
    :show="drawerOpen"
    :width="260"
    placement="left"
    @update:show="onDrawerUpdate"
  >
    <NDrawerContent :native-scrollbar="false" body-content-style="padding: 0;">
      <div class="h-full flex flex-col bg-[var(--bg-card)]">
        <!-- Logo area -->
        <div class="h-16 flex items-center px-4 border-b border-[var(--border)] gap-2">
          <div class="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            H
          </div>
          <div class="text-sm font-semibold">Hermes Panel</div>
        </div>

        <!-- Menu -->
        <nav class="flex-1 overflow-y-auto py-3">
          <button
            v-for="item in items"
            :key="item.key"
            class="w-full flex items-center gap-3 px-3 py-3 mb-0.5 text-sm transition-colors text-left min-h-[44px]"
            :class="[
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
            <span class="truncate">{{ item.label }}</span>
            <span v-if="item.disabled" class="ml-auto text-[10px] opacity-60">N/A</span>
          </button>
        </nav>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
