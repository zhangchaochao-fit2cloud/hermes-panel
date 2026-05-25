<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from '@/components/shared/AppSidebar.vue';
import AppTopbar from '@/components/shared/AppTopbar.vue';
import EventStreamPanel from '@/components/shared/EventStreamPanel.vue';

const route = useRoute();
const showStream = ref(false);
// Mobile sidebar drawer open state. Owned here so AppTopbar's hamburger and
// AppSidebar's drawer share a single source of truth.
const sidebarOpen = ref(false);

// Read initial value from localStorage; default ON for Dashboard, OFF elsewhere.
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

// Stream only renders when not in fullscreen-style routes (Chat takes full height for UX)
const visibleHere = computed(() => route.path !== '/chat' && route.path !== '/memory');

function toggleSidebar(): void {
  sidebarOpen.value = !sidebarOpen.value;
}
</script>

<template>
  <div class="h-full w-full flex">
    <AppSidebar v-model:drawer-open="sidebarOpen" />
    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar @toggle-sidebar="toggleSidebar" />
      <main class="flex-1 min-h-0 overflow-hidden">
        <slot />
      </main>
      <EventStreamPanel v-if="showStream && visibleHere" />
    </div>
  </div>
</template>
