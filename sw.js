const CACHE_NAME = 'wealthyflow-v1';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/style.css',
  '/script.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache-first strategy
        return response || fetch(event.request);
      })
      .catch(() => {
        // Offline fallback logic could go here
      })
  );
});
