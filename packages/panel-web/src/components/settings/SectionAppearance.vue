<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppearanceStore, type FontSize, type ThemeMode } from '@/stores/appearance';

const { t } = useI18n();
const store = useAppearanceStore();
const { mode, color, fontSize } = storeToRefs(store);

interface ModeOption { value: ThemeMode; labelKey: string; icon: string }
const modeOptions: ModeOption[] = [
  { value: 'light', labelKey: 'settings.appearance.mode.light', icon: '☀️' },
  { value: 'dark', labelKey: 'settings.appearance.mode.dark', icon: '🌙' },
  { value: 'auto', labelKey: 'settings.appearance.mode.auto', icon: '🖥' },
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
      <div class="flex gap-3">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          class="flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-all"
          :class="
            mode === opt.value
              ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/5'
              : 'border-[var(--border)] hover:border-[var(--text-3)]'
          "
          @click="store.setMode(opt.value)"
        >
          <span class="text-xl">{{ opt.icon }}</span>
          <span class="text-sm">{{ t(opt.labelKey) }}</span>
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
          class="w-9 h-9 rounded-md transition-all relative flex items-center justify-center"
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
    <div>
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.font.label') }}</div>
      <div class="inline-flex border border-[var(--border)] rounded-md overflow-hidden">
        <button
          v-for="(opt, idx) in fontOptions"
          :key="opt.value"
          class="px-4 py-1.5 text-sm transition-colors"
          :class="[
            fontSize === opt.value
              ? 'bg-[var(--brand-500)] text-white'
              : 'hover:bg-[var(--bg-elevate)]',
            idx > 0 ? 'border-l border-[var(--border)]' : '',
          ]"
          @click="store.setFontSize(opt.value)"
        >
          {{ t(opt.labelKey) }}
          <span class="opacity-60 ml-1 text-xs">{{ opt.px }}px</span>
        </button>
      </div>
    </div>
  </div>
</template>
