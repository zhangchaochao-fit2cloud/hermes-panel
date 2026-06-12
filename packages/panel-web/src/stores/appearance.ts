import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'auto'
  | 'glass-apple'
  | 'glass-vibrant'
  | 'glass-tokyo'
  | 'github-primer'
  | 'glass-minimal';
export type FontSize = 'small' | 'medium' | 'large';
export type Density = 'comfortable' | 'compact';
export type SidebarPosition = 'left' | 'right';

/** Which color family each mode falls into (drives Naive UI dark vs light). */
const MODE_IS_DARK: Record<ThemeMode, boolean | 'auto'> = {
  light: false,
  dark: true,
  auto: 'auto',
  'glass-apple': false,    // Apple frosted glass uses light text on translucent surfaces over a colorful wallpaper
  'glass-vibrant': false,  // Vibrant uses dark text on translucent white
  'glass-tokyo': true,     // Tokyo night is a dark theme
  'github-primer': false,
  'glass-minimal': false,
};

const STORAGE_MODE = 'panel.themeMode';
const STORAGE_COLOR = 'panel.themeColor';
const STORAGE_FONT = 'panel.fontSize';
const STORAGE_ROUTE_TABS = 'panel.routeTabsEnabled';
const STORAGE_DENSITY = 'panel.density';
const STORAGE_REDUCE_MOTION = 'panel.reduceMotion';
const STORAGE_SIDEBAR_POSITION = 'panel.sidebarPosition';
const STORAGE_CUSTOM_COLOR = 'panel.customColor';

const DEFAULT_MODE: ThemeMode = 'auto';
const DEFAULT_COLOR = '#1677ff';
const DEFAULT_FONT: FontSize = 'medium';
const DEFAULT_ROUTE_TABS = true;
const DEFAULT_REDUCE_MOTION = false;
const DEFAULT_SIDEBAR_POSITION: SidebarPosition = 'left';

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
  if (v === 'github-primer' || v === 'glass-minimal') return v;
  // Migrate removed themes to their closest equivalents.
  if (v === 'codex-light') { localStorage.setItem(STORAGE_MODE, 'light'); return 'light'; }
  if (v === 'codex-dark')  { localStorage.setItem(STORAGE_MODE, 'dark');  return 'dark';  }
  if (v === 'minimal-glass') {
    localStorage.setItem(STORAGE_MODE, 'glass-minimal');
    return 'glass-minimal';
  }
  return DEFAULT_MODE;
}

function readColor(): string {
  const custom = localStorage.getItem(STORAGE_CUSTOM_COLOR);
  if (custom && /^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
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

function readDensity(): Density {
  const v = localStorage.getItem(STORAGE_DENSITY);
  return v === 'compact' ? 'compact' : 'comfortable';
}

function readReduceMotion(): boolean {
  const v = localStorage.getItem(STORAGE_REDUCE_MOTION);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return DEFAULT_REDUCE_MOTION;
}

function readSidebarPosition(): SidebarPosition {
  const v = localStorage.getItem(STORAGE_SIDEBAR_POSITION);
  return v === 'right' ? 'right' : 'left';
}

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color);
}

function normalizeHex(color: string): string {
  let c = color.trim();
  if (!c.startsWith('#')) c = '#' + c;
  if (c.length === 4) {
    c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c.toLowerCase();
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

function applyReduceMotion(reduce: boolean): void {
  document.documentElement.setAttribute('data-reduce-motion', String(reduce));
}

function applySidebarPosition(pos: SidebarPosition): void {
  document.documentElement.setAttribute('data-sidebar-position', pos);
}

export const useAppearanceStore = defineStore('appearance', () => {
  const mode = ref<ThemeMode>(readMode());
  const color = ref<string>(readColor());
  const fontSize = ref<FontSize>(readFont());
  const routeTabsEnabled = ref<boolean>(readRouteTabs());
  const density = ref<Density>(readDensity());
  const reduceMotion = ref<boolean>(readReduceMotion());
  const sidebarPosition = ref<SidebarPosition>(readSidebarPosition());

  const previewMode = ref<ThemeMode | null>(null);
  const previewColor = ref<string | null>(null);

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
    color.value = v;
    if (VALID_COLORS.has(v)) {
      localStorage.setItem(STORAGE_COLOR, v);
      localStorage.removeItem(STORAGE_CUSTOM_COLOR);
    } else if (isValidHex(v)) {
      localStorage.setItem(STORAGE_CUSTOM_COLOR, normalizeHex(v));
      localStorage.removeItem(STORAGE_COLOR);
    }
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
  function setDensity(v: Density): void {
    density.value = v;
    localStorage.setItem(STORAGE_DENSITY, v);
    document.documentElement.setAttribute('data-density', v);
  }

  function setReduceMotion(v: boolean): void {
    reduceMotion.value = v;
    localStorage.setItem(STORAGE_REDUCE_MOTION, String(v));
    applyReduceMotion(v);
  }

  function setSidebarPosition(v: SidebarPosition): void {
    sidebarPosition.value = v;
    localStorage.setItem(STORAGE_SIDEBAR_POSITION, v);
    applySidebarPosition(v);
  }

  function setPreviewMode(v: ThemeMode | null): void {
    previewMode.value = v;
  }

  function setPreviewColor(v: string | null): void {
    previewColor.value = v;
  }

  /**
   * Initialise: read from localStorage, apply to DOM, bind OS listener.
   * Safe to call multiple times.
   */
  function init(): void {
    applyThemeAttr(mode.value);
    applyBrandColor(color.value);
    applyFontSize(fontSize.value);
    document.documentElement.setAttribute('data-density', density.value);
    applyReduceMotion(reduceMotion.value);
    applySidebarPosition(sidebarPosition.value);
    bindOsListener();
  }

  // Keep DOM in sync if external code mutates refs directly.
  watch(mode, (v) => applyThemeAttr(v));
  watch(color, (v) => applyBrandColor(v));
  watch(fontSize, (v) => applyFontSize(v));
  watch(reduceMotion, (v) => applyReduceMotion(v));
  watch(sidebarPosition, (v) => applySidebarPosition(v));

  return {
    mode,
    color,
    fontSize,
    routeTabsEnabled,
    density,
    reduceMotion,
    sidebarPosition,
    previewMode,
    previewColor,
    effectiveDark,
    isGlass,
    setMode,
    setColor,
    setFontSize,
    setDensity,
    setReduceMotion,
    setSidebarPosition,
    setPreviewMode,
    setPreviewColor,
    setRouteTabsEnabled,
    init,
  };
});
