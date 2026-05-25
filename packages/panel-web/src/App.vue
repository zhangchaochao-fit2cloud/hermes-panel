<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme, useOsTheme } from 'naive-ui';
import { computed } from 'vue';

const osTheme = useOsTheme();
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <main class="h-full flex items-center justify-center text-base">
          <div class="text-center">
            <h1 class="text-2xl font-semibold">Hermes Panel</h1>
            <p class="mt-2 text-sm opacity-60">v0.1.0-alpha · skeleton</p>
          </div>
        </main>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
