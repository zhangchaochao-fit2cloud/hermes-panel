import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'license-theme';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'auto' ? getSystemPreference() : mode;
}

export const useThemeStore = defineStore('theme', () => {
  const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'auto';
  const mode = ref<ThemeMode>(stored);
  const resolved = ref<'light' | 'dark'>(resolveTheme(stored));

  function applyTheme(isDark: boolean) {
    document.documentElement.classList.toggle('dark', isDark);
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    localStorage.setItem(STORAGE_KEY, newMode);
    resolved.value = resolveTheme(newMode);
    applyTheme(resolved.value === 'dark');
  }

  // Initial apply
  applyTheme(resolved.value === 'dark');

  // Listen for system changes in auto mode
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (mode.value === 'auto') {
        resolved.value = e.matches ? 'dark' : 'light';
        applyTheme(e.matches);
      }
    });
  }

  return { mode, resolved, setMode };
});
