import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN.js';
import enUS from './en-US.js';

const STORAGE_KEY = 'panel.locale';

function detectLocale(): 'zh-CN' | 'en-US' {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  if (navigator.language?.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
});

export function setLocale(locale: 'zh-CN' | 'en-US'): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.setAttribute('lang', locale);
}
