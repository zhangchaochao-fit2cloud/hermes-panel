<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import AppSidebar from '@/components/shared/AppSidebar.vue';
import AppTopbar from '@/components/shared/AppTopbar.vue';
import AppRouteTabs from '@/components/shared/AppRouteTabs.vue';
import EventStreamPanel from '@/components/shared/EventStreamPanel.vue';
import { useAppearanceStore } from '@/stores/appearance';

const route = useRoute();
const appearance = useAppearanceStore();
const { routeTabsEnabled } = storeToRefs(appearance);
const showStream = ref(false);
const sidebarCollapsed = ref(false);

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
</template>
