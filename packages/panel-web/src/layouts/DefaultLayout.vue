<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import AppSidebar from '@/components/shared/AppSidebar.vue';
import AppTopbar from '@/components/shared/AppTopbar.vue';
import AppRouteTabs from '@/components/shared/AppRouteTabs.vue';
import EventStreamPanel from '@/components/shared/EventStreamPanel.vue';
import GlobalSearchModal from '@/components/shared/GlobalSearchModal.vue';
import { useAppearanceStore } from '@/stores/appearance';

const { t } = useI18n();
const route = useRoute();
const appearance = useAppearanceStore();
const { routeTabsEnabled } = storeToRefs(appearance);
const showStream = ref(false);
const sidebarCollapsed = ref(false);
const isOffline = ref(!navigator.onLine);

function handleOnline(): void { isOffline.value = false; }
function handleOffline(): void { isOffline.value = true; }

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

onMounted(() => {
  const stored = localStorage.getItem('panel.showEventStream');
  if (stored === 'true' || stored === 'false') {
    showStream.value = stored === 'true';
  } else {
    showStream.value = route.path === '/dashboard';
  }
});

watch(showStream, (v) => {
  localStorage.setItem('panel.showEventStream', String(v));
});

// Event stream tail panel is suppressed on routes that want full height.
const visibleHere = computed(() => route.path !== '/chat' && route.path !== '/memory');
const pageOwnsScroll = computed(() => route.path === '/chat' || route.path === '/memory');
</script>

<template>
  <!--
    Layout contract:
      - Sidebar is fixed-height and never scrolls
      - Topbar stays outside the scroll region
      - Right-side content owns vertical scrolling
      - EventStreamPanel sits below main as a fixed-height collapsible bar
      - Chat/Memory manage their own inner scroll surfaces
  -->
  <a href="#main-content" class="skip-main">Skip to main content</a>

  <!-- Offline banner -->
  <div v-if="isOffline" class="offline-banner" role="alert">
    <span class="offline-dot" />
    <span>{{ t('common.offlineBanner') }}</span>
  </div>
  <div class="h-[100dvh] w-full flex overflow-hidden bg-[var(--bg-page)]">
    <AppSidebar v-model:collapsed="sidebarCollapsed" />
    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />
      <AppRouteTabs v-if="routeTabsEnabled" />
      <main
        id="main-content"
        class="app-main flex-1 min-h-0 overflow-x-hidden"
        :class="pageOwnsScroll ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'"
      >
        <slot />
      </main>
      <EventStreamPanel v-if="showStream && visibleHere" />
    </div>
  </div>
  <GlobalSearchModal />
</template>

<style scoped>
.offline-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 16px;
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 25%, var(--border));
  color: var(--color-warning);
  font-size: 12px;
  font-weight: 500;
}
.offline-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--color-warning);
  animation: offline-pulse 2s ease-in-out infinite;
}
@keyframes offline-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
