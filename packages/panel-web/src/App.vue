<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import type { GlobalThemeOverrides } from 'naive-ui';
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import ControlCenter from '@/components/shared/ControlCenter.vue';
import { useAppearanceStore } from '@/stores/appearance';

const appearance = useAppearanceStore();
const { color, effectiveDark } = storeToRefs(appearance);
const theme = computed(() => (effectiveDark.value ? darkTheme : null));

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const n = Number.parseInt(normalized, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(22, 119, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixColor(hex: string, target: string, weight: number): string {
  const sourceRgb = hexToRgb(hex) ?? { r: 22, g: 119, b: 255 };
  const targetRgb = hexToRgb(target) ?? { r: 255, g: 255, b: 255 };
  const channel = (a: number, b: number) => Math.round(a * (1 - weight) + b * weight);
  const mixed = [channel(sourceRgb.r, targetRgb.r), channel(sourceRgb.g, targetRgb.g), channel(sourceRgb.b, targetRgb.b)];
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const themeOverrides = computed<GlobalThemeOverrides>(() => {
  const primary = color.value || '#1677ff';
  const hover = mixColor(primary, '#ffffff', effectiveDark.value ? 0.18 : 0.12);
  const pressed = mixColor(primary, '#000000', 0.14);

  return {
  common: {
    primaryColor: primary,
    primaryColorHover: hover,
    primaryColorPressed: pressed,
    primaryColorSuppl: primary,
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    heightMedium: '34px',
  },
  Button: {
    borderRadiusTiny: '6px',
    borderRadiusSmall: '7px',
    borderRadiusMedium: '8px',
    borderRadiusLarge: '8px',
    fontWeight: '500',
    heightSmall: '30px',
    heightMedium: '34px',
    heightLarge: '38px',
  },
  Card: {
    borderRadius: '8px',
    titleFontWeight: '600',
    paddingMedium: '18px 20px',
    paddingHuge: '22px 24px',
  },
  Dialog: {
    borderRadius: '8px',
    titleFontWeight: '600',
    padding: '22px 24px 20px',
  },
  Input: {
    borderRadius: '8px',
    borderHover: `1px solid ${primary}`,
    borderFocus: `1px solid ${primary}`,
    boxShadowFocus: `0 0 0 2px ${colorWithAlpha(primary, 0.18)}`,
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '8px',
        borderHover: `1px solid ${primary}`,
        borderActive: `1px solid ${primary}`,
        boxShadowActive: `0 0 0 2px ${colorWithAlpha(primary, 0.18)}`,
      },
    },
  },
  Tabs: {
    tabTextColorActiveLine: primary,
    barColor: primary,
  },
  Tooltip: {
    // Always render with a solid dark background and pure white text so
    // chips like the thinking-strategy tooltip stay legible even under
    // translucent glass themes where the default rgba(...) bg would mix
    // with the white text into illegible gray.
    color: '#1f2025',
    textColor: '#ffffff',
    borderRadius: '6px',
    padding: '8px 12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.22)',
  },
  Popover: {
    // Popovers used as menus/cards (ModelSwitcher, ContextRing, etc.)
    // should respect the theme — they carry real interactive content.
    color: 'var(--bg-card)',
    textColor: 'var(--text-1)',
    borderRadius: '8px',
  },
  };
});

onMounted(() => appearance.init());
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
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
