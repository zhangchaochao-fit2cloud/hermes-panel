/**
 * Register the service worker for PWA install + basic offline shell.
 * Disabled in Tauri WebView (tauri:// origin) — Tauri provides its own
 * native-app experience so a SW would only add complexity.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Tauri WebView serves from tauri://localhost — skip SW there
  if (location.protocol.startsWith('tauri')) return;

  // Hermes Panel is meant for localhost; don't install SW on weird hosts
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '0.0.0.0') {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent — SW is optional polish, not critical path
    });
  });
}
