import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'auto'
  | 'glass-apple'
  | 'glass-vibrant'
  | 'glass-tokyo'
  | 'codex-light'
  | 'codex-dark'
  | 'github-primer'
  | 'glass-minimal';
export type FontSize = 'small' | 'medium' | 'large';

/** Which color family each mode falls into (drives Naive UI dark vs light). */
const MODE_IS_DARK: Record<ThemeMode, boolean | 'auto'> = {
  light: false,
  dark: true,
  auto: 'auto',
  'glass-apple': false,    // Apple frosted glass uses light text on translucent surfaces over a colorful wallpaper
  'glass-vibrant': false,  // Vibrant uses dark text on translucent white
  'glass-tokyo': true,     // Tokyo night is a dark theme
  'codex-light': false,
  'codex-dark': true,
  'github-primer': false,
  'glass-minimal': false,
};

const STORAGE_MODE = 'panel.themeMode';
const STORAGE_COLOR = 'panel.themeColor';
const STORAGE_FONT = 'panel.fontSize';
const STORAGE_ROUTE_TABS = 'panel.routeTabsEnabled';

const DEFAULT_MODE: ThemeMode = 'auto';
const DEFAULT_COLOR = '#1677ff';
const DEFAULT_FONT: FontSize = 'medium';
const DEFAULT_ROUTE_TABS = true;

const FONT_PX: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '15px',
};

const VALID_COLORS = new Set([
  '#1677ff', '#6366f1', '#722ed1', '#eb2f96', '#52c41a',
  '#0960bd', '#11a8cd', '#fa541c', '#13c2c2', '#f5222d', '#8c8c8c',
]);

function readMode(): ThemeMode {
  const v = localStorage.getItem(STORAGE_MODE);
  if (v === 'light' || v === 'dark' || v === 'auto') return v;
  if (v === 'glass-apple' || v === 'glass-vibrant' || v === 'glass-tokyo') return v;
  if (v === 'codex-light' || v === 'codex-dark' || v === 'github-primer' || v === 'glass-minimal') return v;
  // Migrate the v0.x value 'minimal-glass' (not prefixed glass-, so it
  // missed every glass-only style rule) to the renamed 'glass-minimal'.
  if (v === 'minimal-glass') {
    localStorage.setItem(STORAGE_MODE, 'glass-minimal');
    return 'glass-minimal';
  }
  return DEFAULT_MODE;
}

function readColor(): string {
  const v = localStorage.getItem(STORAGE_COLOR);
  return v && VALID_COLORS.has(v) ? v : DEFAULT_COLOR;
}

function readFont(): FontSize {
  const v = localStorage.getItem(STORAGE_FONT);
  return v === 'small' || v === 'medium' || v === 'large' ? v : DEFAULT_FONT;
}

function readRouteTabs(): boolean {
  const v = localStorage.getItem(STORAGE_ROUTE_TABS);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return DEFAULT_ROUTE_TABS;
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyThemeAttr(mode: ThemeMode): void {
  const root = document.documentElement;
  // Resolve 'auto' -> 'light' | 'dark'
  let effective: ThemeMode = mode;
  if (mode === 'auto') effective = prefersDark() ? 'dark' : 'light';

  // data-theme: lets CSS swap variable bundles
  if (effective === 'light') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', effective);
  }
}

function applyBrandColor(color: string): void {
  const root = document.documentElement;
  root.style.setProperty('--brand-500', color);
  // OKLCH-based derivation; modern browsers (Chromium 111+, Safari 16.4+, FF 113+) support it
  root.style.setProperty('--brand-600', `color-mix(in oklch, ${color} 85%, black)`);
  root.style.setProperty('--brand-700', `color-mix(in oklch, ${color} 70%, black)`);
}

function applyFontSize(size: FontSize): void {
  document.documentElement.style.fontSize = FONT_PX[size];
}

export const useAppearanceStore = defineStore('appearance', () => {
  const mode = ref<ThemeMode>(readMode());
  const color = ref<string>(readColor());
  const fontSize = ref<FontSize>(readFont());
  const routeTabsEnabled = ref<boolean>(readRouteTabs());

  // Tracks the current OS color-scheme preference so `effectiveDark` is reactive
  // when the user picks "auto".
  const osDark = ref<boolean>(prefersDark());

  let mql: MediaQueryList | null = null;
  function onOsChange(ev: MediaQueryListEvent): void {
    osDark.value = ev.matches;
    if (mode.value === 'auto') applyThemeAttr('auto');
  }

  function bindOsListener(): void {
    if (mql) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', onOsChange);
  }

  const effectiveDark = computed(() => {
    const m = mode.value;
    if (m === 'auto') return osDark.value;
    const flag = MODE_IS_DARK[m];
    return flag === 'auto' ? osDark.value : flag;
  });

  /** True if current mode uses translucent surfaces (backdrop-filter). */
  const isGlass = computed(() => mode.value.startsWith('glass-'));

  function setMode(v: ThemeMode): void {
    mode.value = v;
    localStorage.setItem(STORAGE_MODE, v);
    applyThemeAttr(v);
  }

  function setColor(v: string): void {
    if (!VALID_COLORS.has(v)) return;
    color.value = v;
    localStorage.setItem(STORAGE_COLOR, v);
    applyBrandColor(v);
  }

  function setFontSize(v: FontSize): void {
    fontSize.value = v;
    localStorage.setItem(STORAGE_FONT, v);
    applyFontSize(v);
  }

  function setRouteTabsEnabled(v: boolean): void {
    routeTabsEnabled.value = v;
    localStorage.setItem(STORAGE_ROUTE_TABS, String(v));
  }

  /**
   * Initialise: read from localStorage, apply to DOM, bind OS listener.
   * Safe to call multiple times.
   */
  function init(): void {
    applyThemeAttr(mode.value);
    applyBrandColor(color.value);
    applyFontSize(fontSize.value);
    bindOsListener();
  }

  // Keep DOM in sync if external code mutates refs directly.
  watch(mode, (v) => applyThemeAttr(v));
  watch(color, (v) => applyBrandColor(v));
  watch(fontSize, (v) => applyFontSize(v));

  return {
    mode,
    color,
    fontSize,
    routeTabsEnabled,
    effectiveDark,
    isGlass,
    setMode,
    setColor,
    setFontSize,
    setRouteTabsEnabled,
    init,
  };
});
