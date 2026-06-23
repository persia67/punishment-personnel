const CACHE_NAME = 'safewatch-v4';
const DYNAMIC_CACHE = 'safewatch-dynamic-v4';

// Assets to pre-cache immediately
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json' 
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return; 
  
  // Do not intercept or cache API endpoints
  if (event.request.url.includes('/api/')) return;

  // Network-First for index.html or root root to always fetch latest updates when online
  const isHtml = event.request.url.endsWith('/') || event.request.url.includes('index.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Stale-While-Revalidate for other static assets (images, fonts, scripts)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              if (networkResponse.type === 'opaque') {
                  // Cache opaque responses (CDNs)
              } else {
                  return networkResponse;
              }
          }

          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((err) => {
          console.log('[SW] Fetch failed, returning offline fallback if available', err);
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});