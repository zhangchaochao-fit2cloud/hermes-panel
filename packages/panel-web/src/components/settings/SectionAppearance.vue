<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { NSwitch } from 'naive-ui';
import { useAppearanceStore, type FontSize, type ThemeMode } from '@/stores/appearance';

const { t } = useI18n();
const store = useAppearanceStore();
const { mode, color, fontSize, routeTabsEnabled } = storeToRefs(store);

interface ModeOption {
  value: ThemeMode;
  labelKey: string;
  icon: string;
  /** Inline mini-preview CSS so the user sees the look without applying */
  previewStyle?: Record<string, string>;
}
const modeOptions: ModeOption[] = [
  { value: 'light', labelKey: 'settings.appearance.mode.light', icon: '☀️',
    previewStyle: { background: '#f7f8fa' } },
  { value: 'dark', labelKey: 'settings.appearance.mode.dark', icon: '🌙',
    previewStyle: { background: '#0a0a0b' } },
  { value: 'auto', labelKey: 'settings.appearance.mode.auto', icon: '🖥',
    previewStyle: { background: 'linear-gradient(90deg, #f7f8fa 50%, #0a0a0b 50%)' } },
  { value: 'codex-light', labelKey: 'settings.appearance.mode.codexLight', icon: '◻️',
    previewStyle: { background: '#fafafa', border: '1px solid #e5e5e5' } },
  { value: 'codex-dark', labelKey: 'settings.appearance.mode.codexDark', icon: '◼️',
    previewStyle: { background: '#0d0d0d' } },
  { value: 'github-primer', labelKey: 'settings.appearance.mode.githubPrimer', icon: '🐙',
    previewStyle: { background: 'linear-gradient(135deg, #f6f8fa 0%, #ffffff 70%)', borderTop: '3px solid #0969da' } },
  { value: 'glass-minimal', labelKey: 'settings.appearance.mode.minimalGlass', icon: '◌',
    previewStyle: {
      background: 'radial-gradient(ellipse at 30% 30%, rgba(165, 180, 252, 0.6) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(186, 230, 253, 0.6) 0%, transparent 60%), linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
    } },
  { value: 'glass-apple', labelKey: 'settings.appearance.mode.glassApple', icon: '🍎',
    previewStyle: {
      background: 'radial-gradient(circle at 30% 30%, #d65a3e 0%, transparent 40%), linear-gradient(135deg, #c378d6 0%, #5b67d6 60%, #2a93cc 100%)',
    } },
  { value: 'glass-vibrant', labelKey: 'settings.appearance.mode.glassVibrant', icon: '🌈',
    previewStyle: { background: 'linear-gradient(135deg, #ff9a9e, #fad0c4, #fbc2eb, #a6c1ee)' } },
  { value: 'glass-tokyo', labelKey: 'settings.appearance.mode.glassTokyo', icon: '🌃',
    previewStyle: {
      background: 'radial-gradient(circle at 30% 20%, rgba(122, 162, 247, 0.4) 0%, transparent 60%), #1a1b26',
    } },
];

const colors: { value: string; name: string }[] = [
  { value: '#1677ff', name: 'Default Blue' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#722ed1', name: 'Romantic Purple' },
  { value: '#eb2f96', name: 'Soft Pink' },
  { value: '#52c41a', name: 'Natural Green' },
  { value: '#0960bd', name: 'Geek Blue' },
  { value: '#11a8cd', name: 'Night Green' },
  { value: '#fa541c', name: 'Vital Orange' },
  { value: '#13c2c2', name: 'Calm Cyan' },
  { value: '#f5222d', name: 'Alert Red' },
  { value: '#8c8c8c', name: 'Moon Silver' },
];

interface FontOption { value: FontSize; labelKey: string; px: number }
const fontOptions: FontOption[] = [
  { value: 'small', labelKey: 'settings.appearance.font.small', px: 13 },
  { value: 'medium', labelKey: 'settings.appearance.font.medium', px: 14 },
  { value: 'large', labelKey: 'settings.appearance.font.large', px: 15 },
];
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.appearance.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.appearance.desc') }}</p>

    <!-- Mode -->
    <div class="mb-8">
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.mode.label') }}</div>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          class="cursor-pointer flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all overflow-hidden"
          :class="
            mode === opt.value
              ? 'border-[var(--brand-500)] shadow-[var(--shadow-2)]'
              : 'border-[var(--border)] hover:border-[var(--text-3)]'
          "
          @click="store.setMode(opt.value)"
        >
          <div
            class="w-full h-12 rounded-md mb-1 relative overflow-hidden"
            :style="opt.previewStyle"
          >
            <div class="absolute inset-x-2 top-2 h-1 bg-white/30 rounded-full" />
            <div class="absolute inset-x-2 top-4 h-1 w-2/3 bg-white/20 rounded-full" />
            <div class="absolute bottom-1 left-2 right-2 h-3 rounded bg-white/20 backdrop-blur" />
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span>{{ opt.icon }}</span>
            <span class="font-medium">{{ t(opt.labelKey) }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Brand color -->
    <div class="mb-8">
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.color.label') }}</div>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="c in colors"
          :key="c.value"
          class="cursor-pointer w-9 h-9 rounded-md transition-all relative flex items-center justify-center"
          :class="
            color === c.value
              ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)]'
              : 'hover:scale-110'
          "
          :style="{
            backgroundColor: c.value,
            // eslint-disable-next-line vue/v-bind-style
            ['--tw-ring-color' as string]: c.value,
          }"
          :title="c.name"
          :aria-label="c.name"
          @click="store.setColor(c.value)"
        >
          <span v-if="color === c.value" class="text-white text-sm">✓</span>
        </button>
      </div>
    </div>

    <!-- Font size -->
    <div class="mb-8">
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.font.label') }}</div>
      <div class="grid grid-cols-3 gap-3 max-w-md">
        <button
          v-for="opt in fontOptions"
          :key="opt.value"
          class="cursor-pointer flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg border-2 transition-all"
          :class="
            fontSize === opt.value
              ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/5 shadow-[var(--shadow-1)]'
              : 'border-[var(--border)] hover:border-[var(--text-3)] hover:bg-[var(--bg-elevate)]'
          "
          @click="store.setFontSize(opt.value)"
        >
          <span
            class="font-semibold leading-none"
            :class="fontSize === opt.value ? 'text-[var(--brand-600)]' : 'text-[var(--text-1)]'"
            :style="{ fontSize: `${opt.px + 4}px` }"
          >Aa</span>
          <span
            class="text-xs leading-tight"
            :class="fontSize === opt.value ? 'text-[var(--brand-600)] font-medium' : 'text-[var(--text-2)]'"
          >{{ t(opt.labelKey) }}</span>
          <span class="text-[10px] font-mono text-[var(--text-3)] tabular-nums">{{ opt.px }}px</span>
        </button>
      </div>
    </div>

    <!-- Route tabs toggle -->
    <div>
      <div class="text-sm font-medium mb-1">{{ t('settings.appearance.routeTabs.label') }}</div>
      <div class="flex items-center gap-3">
        <NSwitch
          :value="routeTabsEnabled"
          @update:value="(v: boolean) => store.setRouteTabsEnabled(v)"
        />
        <span class="text-xs text-[var(--text-3)]">
          {{ t('settings.appearance.routeTabs.hint') }}
        </span>
      </div>
    </div>
  </div>
</template>
