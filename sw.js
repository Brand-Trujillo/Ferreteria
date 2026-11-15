const CACHE = 'cobos-shell-v8';
const FILES = [
  './', './index.html', './manifest.webmanifest', './styles/app.css',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './src/app.js', './src/inventory/database.js', './src/inventory/validation.js',
  './src/inventory/stock-check.js', './src/scanner/scanner.js',
  './src/sales/sales.js', './src/sales/storage.js', './src/reports/reports.js',
  './src/cash/cash.js', './src/cash/storage.js', './src/backup/backup.js',
  './src/credits/credits.js', './src/credits/storage.js',
  './src/catalog/catalog.js',
  './src/common/numbers.js', './src/common/connection.js', './src/common/offline.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('cobos-shell-') && key !== CACHE).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    const root = new URL('./', self.registration.scope);
    if (url.pathname !== root.pathname && url.pathname !== new URL('index.html', root).pathname) return;
    event.respondWith((async () => {
      const cached = await caches.match('./index.html');
      return cached || fetch(event.request);
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
