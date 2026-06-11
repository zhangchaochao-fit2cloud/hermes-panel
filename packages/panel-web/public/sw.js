/* global self, caches, fetch */

const CACHE = 'hermes-panel-v3';
const OFFLINE_CACHE = 'hermes-panel-offline-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/offline.html'];
const STATIC_EXT = /\.(js|css|png|svg|woff2)(\?|$)/;

function isCacheableApi(url) {
  if (url.method !== 'GET') return false;
  const p = url.pathname;
  return (
    p.startsWith('/api/stats/') ||
    p === '/api/capabilities' ||
    p === '/api/system/health'
  );
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirst(req, maxAge = 0) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) {
      const header = cached.headers.get('sw-cached-at');
      if (header && maxAge > 0) {
        const age = Date.now() - Number(header);
        if (age < maxAge) return cached;
      }
      return cached;
    }
    throw err;
  }
}

async function handleOfflineHtml() {
  const cache = await caches.open(OFFLINE_CACHE);
  const cached = await cache.match('/offline.html');
  if (cached) return cached;
  const res = await fetch('/offline.html').catch(() => null);
  if (res && res.ok) {
    await cache.put('/offline.html', res.clone());
    return res;
  }
  return new Response('Offline', { headers: { 'Content-Type': 'text/html' }, status: 503 });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== OFFLINE_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isCacheableApi(url)) {
    event.respondWith(networkFirst(req, 30000));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname === '/' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      networkFirst(req).catch(() => handleOfflineHtml()),
    );
    return;
  }

  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  for (const req of keys) {
    if (req.url.includes('/api/')) {
      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res);
      } catch (e) {
        /* skip */
      }
    }
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  const title = data.title || 'Hermes Panel';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-48.png',
    tag: data.tag || 'hermes-notification',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});