<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import ControlCenter from '@/components/shared/ControlCenter.vue';
import { useAppearanceStore } from '@/stores/appearance';

const appearance = useAppearanceStore();
const { effectiveDark } = storeToRefs(appearance);
const theme = computed(() => (effectiveDark.value ? darkTheme : null));

onMounted(() => appearance.init());
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <DefaultLayout>
            <RouterView />
          </DefaultLayout>
          <ControlCenter />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
