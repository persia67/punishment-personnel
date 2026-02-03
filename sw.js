const CACHE_NAME = 'safewatch-v2';
const DYNAMIC_CACHE = 'safewatch-dynamic-v2';

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

// Fetch Event (Stale-While-Revalidate Strategy for most resources)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or requests to different origins if needed
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return; 

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            // For external resources (cors), type might be 'cors' or 'opaque'
             if (networkResponse.type === 'opaque') {
                 // Cache opaque responses (CDNs)
             } else {
                 return networkResponse;
             }
        }

        // Clone and cache the new response
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.log('[SW] Fetch failed, returning offline fallback if available', err);
      });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});