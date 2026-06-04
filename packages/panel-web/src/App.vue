<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import ControlCenter from '@/components/shared/ControlCenter.vue';
import HotkeysCheatsheet from '@/components/shared/HotkeysCheatsheet.vue';
import AppErrorBoundary from '@/components/shared/AppErrorBoundary.vue';
import { useAppearanceStore } from '@/stores/appearance';
import { createPanelThemeOverrides } from '@/utils/naive-theme';

const route = useRoute();
const router = useRouter();
const appearance = useAppearanceStore();
const { color, effectiveDark } = storeToRefs(appearance);
const theme = computed(() => (effectiveDark.value ? darkTheme : null));
const themeOverrides = computed(() =>
  createPanelThemeOverrides({
    primary: color.value,
    dark: effectiveDark.value,
  }),
);

// Public routes (login) render full-screen without the app chrome.
const isChrome = computed(() => !route.meta.public);

onMounted(() => appearance.init());

// Navigation shortcuts: Mod+1..9 for quick view switching
const NAV_SHORTCUTS: Record<string, string> = {
  '1': '/dashboard',
  '2': '/chat',
  '3': '/sessions',
  '4': '/files',
  '5': '/memory',
  '6': '/tools',
  '7': '/channels',
  '8': '/developer',
  '9': '/settings',
};

const closedTabs: string[] = [];

function pushClosedTab(path: string): void {
  if (path === '/dashboard') return;
  closedTabs.push(path);
  if (closedTabs.length > 10) closedTabs.shift();
}

router.afterEach((to, from) => {
  if (from && from.path !== to.path) pushClosedTab(from.path);
});

function handleNavShortcut(e: KeyboardEvent): void {
  const mod = e.metaKey || e.ctrlKey;
  // Mod+Shift+T: restore last closed tab
  if (mod && e.shiftKey && e.key === 't') {
    e.preventDefault();
    const path = closedTabs.pop();
    if (path) router.push(path);
    return;
  }
  if (!mod || e.shiftKey || e.altKey) return;
  const target = NAV_SHORTCUTS[e.key];
  if (!target) return;
  const el = e.target as HTMLElement;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
  e.preventDefault();
  router.push(target);
}

onMounted(() => { window.addEventListener('keydown', handleNavShortcut); });
onBeforeUnmount(() => { window.removeEventListener('keydown', handleNavShortcut); });
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <DefaultLayout v-if="isChrome">
            <AppErrorBoundary>
              <RouterView v-slot="{ Component }">
                
                  <component :is="Component" />
                
              </RouterView>
            </AppErrorBoundary>
          </DefaultLayout>
          <template v-else>
            <AppErrorBoundary>
              <RouterView v-slot="{ Component }">
                
                  <component :is="Component" />
                
              </RouterView>
            </AppErrorBoundary>
          </template>
          <ControlCenter v-if="isChrome" />
          <HotkeysCheatsheet v-if="isChrome" />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
