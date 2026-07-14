// Aurora OS - PWA Service Worker
const CACHE_NAME = 'auroraos-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon_pwa.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) return;

  // Skip POST and non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip caching API routes to prevent stale business data
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* ignore network failures */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Only cache valid GET responses of local assets
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Fallback for document navigation
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
        }
        return new Response('Conexión perdida. Aurora OS requiere internet para sincronizar datos.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
