// Service Worker for Nigeria Map Explorer
// Caches static assets and PMTiles data for offline use.

const CACHE_NAME = 'ng-map-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles/styles.css',
  './js/main.js',
  './js/MapManager.js',
  './js/config.js',
  './data/senatorial.json',
  './data/manualLgaCorrections.json',
  './manifest.json',
];

// CDN assets — cache on first use (stale-while-revalidate)
const CDN_HOSTS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'basemaps.cartocdn.com',
];

// PMTiles host — cache tile requests with size limit
const TILES_HOST = 'tiles.staygis.com';
const TILES_CACHE = 'ng-map-tiles-v2';
const MAX_TILE_CACHE_ENTRIES = 500;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== TILES_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // PMTiles tile requests: cache-first with eviction
  if (url.hostname === TILES_HOST) {
    event.respondWith(
      caches.open(TILES_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) {
              const cloned = response.clone();
              // Evict oldest entries if cache is too large
              cache.keys().then(keys => {
                if (keys.length > MAX_TILE_CACHE_ENTRIES) {
                  cache.delete(keys[0]);
                }
              });
              cache.put(event.request, cloned);
            }
            return response;
          });
        })
      ).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  // CDN assets: stale-while-revalidate
  if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});
