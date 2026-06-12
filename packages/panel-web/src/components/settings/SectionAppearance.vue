<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { NSwitch, NButton, NInput } from 'naive-ui';
import { useAppearanceStore, type FontSize, type ThemeMode, type SidebarPosition } from '@/stores/appearance';
import { useDesktopNotify } from '@/composables/useDesktopNotify';

const { t } = useI18n();
const store = useAppearanceStore();
const { mode, color, fontSize, routeTabsEnabled, reduceMotion, sidebarPosition } = storeToRefs(store);
const { request: requestNotify, granted: notifyGranted } = useDesktopNotify();

const customColorInput = ref('');
const showCustomColor = ref(false);

interface ModeOption {
  value: ThemeMode;
  labelKey: string;
  descKey: string;
  bestForKey: string;
  icon: string;
  previewStyle?: Record<string, string>;
}
const modeOptions: ModeOption[] = [
  { value: 'light', labelKey: 'settings.appearance.mode.light', descKey: 'settings.appearance.modeDesc.light', bestForKey: 'settings.appearance.modeBestFor.light', icon: '☀️',
    previewStyle: { background: '#f7f8fa' } },
  { value: 'dark', labelKey: 'settings.appearance.mode.dark', descKey: 'settings.appearance.modeDesc.dark', bestForKey: 'settings.appearance.modeBestFor.dark', icon: '🌙',
    previewStyle: { background: '#0a0a0b' } },
  { value: 'auto', labelKey: 'settings.appearance.mode.auto', descKey: 'settings.appearance.modeDesc.auto', bestForKey: 'settings.appearance.modeBestFor.auto', icon: '🖥',
    previewStyle: { background: 'linear-gradient(90deg, #f7f8fa 50%, #0a0a0b 50%)' } },
  { value: 'github-primer', labelKey: 'settings.appearance.mode.githubPrimer', descKey: 'settings.appearance.modeDesc.githubPrimer', bestForKey: 'settings.appearance.modeBestFor.githubPrimer', icon: '🐙',
    previewStyle: { background: 'linear-gradient(135deg, #f6f8fa 0%, #ffffff 70%)', borderTop: '3px solid #0969da' } },
  { value: 'glass-minimal', labelKey: 'settings.appearance.mode.minimalGlass', descKey: 'settings.appearance.modeDesc.minimalGlass', bestForKey: 'settings.appearance.modeBestFor.minimalGlass', icon: '◌',
    previewStyle: {
      background: 'radial-gradient(ellipse at 30% 30%, rgba(165, 180, 252, 0.6) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(186, 230, 253, 0.6) 0%, transparent 60%), linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
    } },
  { value: 'glass-apple', labelKey: 'settings.appearance.mode.glassApple', descKey: 'settings.appearance.modeDesc.glassApple', bestForKey: 'settings.appearance.modeBestFor.glassApple', icon: '🍎',
    previewStyle: {
      background: 'radial-gradient(circle at 30% 30%, #d65a3e 0%, transparent 40%), linear-gradient(135deg, #c378d6 0%, #5b67d6 60%, #2a93cc 100%)',
    } },
  { value: 'glass-vibrant', labelKey: 'settings.appearance.mode.glassVibrant', descKey: 'settings.appearance.modeDesc.glassVibrant', bestForKey: 'settings.appearance.modeBestFor.glassVibrant', icon: '🌈',
    previewStyle: { background: 'linear-gradient(135deg, #ff9a9e, #fad0c4, #fbc2eb, #a6c1ee)' } },
  { value: 'glass-tokyo', labelKey: 'settings.appearance.mode.glassTokyo', descKey: 'settings.appearance.modeDesc.glassTokyo', bestForKey: 'settings.appearance.modeBestFor.glassTokyo', icon: '🌃',
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

const sidebarOptions: { value: SidebarPosition; labelKey: string; icon: string }[] = [
  { value: 'left', labelKey: 'settings.appearance.sidebarPosition.left', icon: '◧' },
  { value: 'right', labelKey: 'settings.appearance.sidebarPosition.right', icon: '◨' },
];

function isValidHex(c: string): boolean {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(c);
}

function normalizeHex(c: string): string {
  let v = c.trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (v.length === 4) {
    v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  return v.toLowerCase();
}

function onCustomColorInput(): void {
  const normalized = normalizeHex(customColorInput.value);
  if (isValidHex(normalized)) {
    store.setColor(normalized);
  }
}

const previewBgStyle = computed(() => {
  const m = store.previewMode ?? mode.value;
  const opt = modeOptions.find((o) => o.value === m);
  return opt?.previewStyle ?? {};
});

const previewBrandColor = computed(() => store.previewColor ?? color.value);
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.appearance.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.appearance.desc') }}</p>

    <!-- Mode -->
    <div class="mb-8">
      <div class="mb-3 flex flex-col gap-1">
        <div class="text-sm font-medium">{{ t('settings.appearance.mode.label') }}</div>
        <p class="text-xs leading-5 text-[var(--text-3)]">{{ t('settings.appearance.mode.hint') }}</p>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          class="cursor-pointer flex flex-col items-stretch gap-2 p-3 rounded-lg border-2 transition-all overflow-hidden text-[var(--text-1)] bg-[var(--bg-card)] text-left"
          :class="
            mode === opt.value
              ? 'border-[var(--brand-500)] shadow-[var(--shadow-2)]'
              : 'border-[var(--border)] hover:border-[var(--text-3)]'
          "
          @mouseenter="store.setPreviewMode(opt.value)"
          @mouseleave="store.setPreviewMode(null)"
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
          <p class="min-h-[40px] text-xs leading-5 text-[var(--text-3)]">{{ t(opt.descKey) }}</p>
          <div class="rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-[11px] leading-4 text-[var(--text-2)]">
            {{ t(opt.bestForKey) }}
          </div>
        </button>
      </div>
    </div>

    <!-- Live preview bar -->
    <div class="mb-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.livePreview') }}</div>
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold" :style="{ backgroundColor: previewBrandColor }">
          Aa
        </div>
        <div class="flex-1">
          <div class="h-3 rounded-full mb-2" :style="{ width: '60%', backgroundColor: previewBrandColor, opacity: 0.7 }" />
          <div class="h-2 rounded-full mb-1 bg-[var(--text-3)]" :style="{ width: '80%' }" />
          <div class="h-2 rounded-full bg-[var(--text-3)]" :style="{ width: '40%' }" />
        </div>
      </div>
    </div>

    <!-- Brand color -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-medium">{{ t('settings.appearance.color.label') }}</div>
        <NButton size="tiny" quaternary @click="showCustomColor = !showCustomColor">
          {{ showCustomColor ? t('settings.appearance.color.hideCustom') : t('settings.appearance.color.custom') }}
        </NButton>
      </div>
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
            ['--tw-ring-color' as string]: c.value,
          }"
          :title="c.name"
          :aria-label="c.name"
          @mouseenter="store.setPreviewColor(c.value)"
          @mouseleave="store.setPreviewColor(null)"
          @click="store.setColor(c.value)"
        >
          <span v-if="color === c.value" class="text-white text-sm">✓</span>
        </button>
      </div>
      <div v-if="showCustomColor" class="mt-3 flex items-center gap-2">
        <input
          type="color"
          :value="color"
          class="w-9 h-9 rounded cursor-pointer border-0 p-0"
          @input="(e) => { const v = (e.target as HTMLInputElement).value; customColorInput = v; store.setColor(v); }"
        >
        <NInput
          v-model:value="customColorInput"
          :placeholder="t('settings.appearance.color.hexPlaceholder')"
          size="small"
          class="max-w-[160px]"
          @keyup.enter="onCustomColorInput"
        />
        <NButton size="small" :disabled="!isValidHex(normalizeHex(customColorInput))" @click="onCustomColorInput">
          {{ t('settings.appearance.color.apply') }}
        </NButton>
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
    <div class="mb-6">
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

    <!-- Density toggle -->
    <div class="mb-6">
      <div class="text-sm font-medium mb-1">{{ t('settings.appearance.density.label') }}</div>
      <div class="flex items-center gap-3">
        <NSwitch
          :value="store.density === 'compact'"
          @update:value="(v: boolean) => store.setDensity(v ? 'compact' : 'comfortable')"
        />
        <span class="text-xs text-[var(--text-3)]">{{ t('settings.appearance.density.hint') }}</span>
      </div>
    </div>

    <!-- Reduce motion -->
    <div class="mb-6">
      <div class="text-sm font-medium mb-1">{{ t('settings.appearance.reduceMotion.label') }}</div>
      <div class="flex items-center gap-3">
        <NSwitch
          :value="reduceMotion"
          @update:value="(v: boolean) => store.setReduceMotion(v)"
        />
        <span class="text-xs text-[var(--text-3)]">{{ t('settings.appearance.reduceMotion.hint') }}</span>
      </div>
    </div>

    <!-- Sidebar position -->
    <div class="mb-6">
      <div class="text-sm font-medium mb-3">{{ t('settings.appearance.sidebarPosition.label') }}</div>
      <div class="flex gap-3">
        <button
          v-for="opt in sidebarOptions"
          :key="opt.value"
          class="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all text-sm"
          :class="
            sidebarPosition === opt.value
              ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/5 shadow-[var(--shadow-1)]'
              : 'border-[var(--border)] hover:border-[var(--text-3)] hover:bg-[var(--bg-elevate)]'
          "
          @click="store.setSidebarPosition(opt.value)"
        >
          <span class="text-lg">{{ opt.icon }}</span>
          <span :class="sidebarPosition === opt.value ? 'text-[var(--brand-600)] font-medium' : 'text-[var(--text-1)]'">{{ t(opt.labelKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Desktop notifications -->
    <div>
      <div class="text-sm font-medium mb-1">{{ t('settings.appearance.notify.label') }}</div>
      <NButton size="tiny" @click="requestNotify()">{{ notifyGranted ? t('settings.appearance.notify.enabled') : t('settings.appearance.notify.enable') }}</NButton>
    </div>
  </div>
</template>