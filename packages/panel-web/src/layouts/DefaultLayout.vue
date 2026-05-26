<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from '@/components/shared/AppSidebar.vue';
import AppTopbar from '@/components/shared/AppTopbar.vue';
import EventStreamPanel from '@/components/shared/EventStreamPanel.vue';

const route = useRoute();
const showStream = ref(false);

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
</script>

<template>
  <!--
    Layout contract:
      - Sidebar is fixed (h-full, never scrolls)
      - Topbar is fixed (h-16, sticky)
      - Main content area is the ONLY vertical scroller for the app
      - EventStreamPanel sits below main as a fixed-height collapsible bar
    Pages that want their own internal layout (Chat full-height, Memory
    3-column) opt out by rendering `h-full` content; routes listed in
    `flushHere` skip the layout's scroll wrapper so they can manage it.
  -->
  <div class="h-full w-full flex overflow-hidden">
    <AppSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar />
      <main class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <slot />
      </main>
      <EventStreamPanel v-if="showStream && visibleHere" />
    </div>
  </div>
</template>
