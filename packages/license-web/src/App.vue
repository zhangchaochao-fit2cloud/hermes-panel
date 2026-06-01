<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { darkTheme, zhCN, dateZhCN, useMessage } from 'naive-ui';
import { useThemeStore } from '@/stores/theme';
import { useToast } from '@/stores/toast';

const theme = useThemeStore();
const toast = useToast();
const message = useMessage();

const naiveTheme = computed(() => theme.resolved === 'dark' ? darkTheme : null);

const themeOverrides = computed(() => {
  if (theme.resolved !== 'dark') return {};
  return {
    common: {
      primaryColor: '#818cf8',
      primaryColorHover: '#6366f1',
      bodyColor: '#0f0f12',
      cardColor: '#121215',
      modalColor: '#121215',
      popoverColor: '#121215',
      borderColor: 'rgba(255,255,255,0.08)',
      inputColor: 'rgba(255,255,255,0.04)',
    },
    Button: {
      colorPrimary: '#818cf8',
      colorHoverPrimary: '#6366f1',
    },
    Tag: {
      colorBorderedDefault: 'rgba(255,255,255,0.06)',
      textColorBorderedDefault: 'rgba(255,255,255,0.5)',
    },
    DataTable: {
      thColor: 'transparent',
      tdColor: 'transparent',
    },
  };
});

// Theme-color meta
watch(() => theme.resolved, (isDark) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = isDark ? '#0a0a0c' : '#fafbfc';
  if (meta) meta.setAttribute('content', color);
  else {
    const m = document.createElement('meta'); m.name = 'theme-color'; m.content = color;
    document.head.appendChild(m);
  }
}, { immediate: true });

// Toast bridge — watches reactive queue and pushes to Naive UI message
watch(() => [...toast.queue.value], (items) => {
  for (const item of items) {
    const method = message[item.type] as (content: string, options?: object) => void;
    method(item.content, { duration: item.duration ?? (item.type === 'error' ? 5000 : 3000) });
    toast.consume(item.id);
  }
});
</script>
