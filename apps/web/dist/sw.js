// DinoFlow Offline-First Service Worker
const CACHE_NAME = 'dinoflow-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/dinoflow-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache First with Network Fallback for assets; Network First for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For API and WebSocket, pass straight through with offline graceful handling
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).catch(() => {
        // Fallback to index.html for SPA routes
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Push notification receiver
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'DinoFlow Alerta', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 DinoFlow: Alerta Hidráulica';
  const options = {
    body: data.body || 'Se ha detectado una anomalía en la red hidráulica.',
    icon: '/dinoflow-logo.svg',
    badge: '/dinoflow-logo.svg',
    vibrate: [200, 100, 200],
    data: data
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
