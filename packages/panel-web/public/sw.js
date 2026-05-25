/* global self, caches, fetch */
// Hermes Panel service worker — minimal stale-while-revalidate for app shell.
// We deliberately do NOT cache /api/* to avoid stale data; only static assets.

const CACHE = 'hermes-panel-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {/* offline at install */}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache API or local hermes endpoints
  if (url.pathname.startsWith('/api/') || url.port === '5667' || url.port === '8642') {
    return;
  }

  // Same-origin static asset → cache-first with revalidation
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetched = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetched;
      }),
    );
  }
});
