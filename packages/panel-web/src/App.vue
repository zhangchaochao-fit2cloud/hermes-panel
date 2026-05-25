<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme, useOsTheme } from 'naive-ui';
import { computed } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const osTheme = useOsTheme();
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <DefaultLayout>
          <RouterView />
        </DefaultLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
