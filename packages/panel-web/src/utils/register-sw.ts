export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
        .catch(() => {});
    });
    return;
  }

  if (location.protocol.startsWith('tauri')) return;

  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '0.0.0.0') {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      if ('sync' in reg) {
        reg.sync.register('retry-failed-requests').catch(() => {});
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              window.dispatchEvent(new Event('sw-updated'));
            }
          });
        }
      });
    }).catch(() => {});
  });
}
