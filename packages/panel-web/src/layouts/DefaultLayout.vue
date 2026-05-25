<script setup lang="ts">
import AppSidebar from '@/components/shared/AppSidebar.vue';
import AppTopbar from '@/components/shared/AppTopbar.vue';
</script>

<template>
  <div class="h-full w-full flex">
    <AppSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar />
      <main class="flex-1 min-h-0 overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
