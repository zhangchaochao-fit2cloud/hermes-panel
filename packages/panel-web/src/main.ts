import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';
import { i18n } from './locales/index.js';
import { registerServiceWorker } from './utils/register-sw.js';
import './styles/theme.css';

// Detect the running platform so CSS can react to macOS (which needs to
// reserve space for the overlay traffic-light buttons). We mirror this on
// <html data-tauri-platform="…"> only when actually running inside a Tauri
// shell; plain browser dev keeps the attribute absent.
function tagPlatform(): void {
  // Tauri 2 exposes `window.__TAURI_INTERNALS__` (and the older
  // __TAURI__). Either signals desktop shell.
  const w = window as typeof window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };
  const inTauri = !!(w.__TAURI_INTERNALS__ || w.__TAURI__);
  if (!inTauri) return;
  const ua = navigator.userAgent;
  let platform: 'macos' | 'windows' | 'linux' | undefined;
  if (/Mac OS X|Macintosh/.test(ua)) platform = 'macos';
  else if (/Windows/.test(ua)) platform = 'windows';
  else if (/Linux|X11/.test(ua)) platform = 'linux';
  if (platform) document.documentElement.dataset.tauriPlatform = platform;
}
tagPlatform();

const app = createApp(App);
// Last-resort handler for component errors that escape both the per-view
// catch blocks and AppErrorBoundary (which stops propagation for render
// errors but lifecycle hooks outside the boundary still land here). We
// keep this minimal — the boundary owns the UI; this is just a log.
app.config.errorHandler = (err, _instance, info) => {
  console.error('[panel:vue]', info, err);
};
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');

registerServiceWorker();
