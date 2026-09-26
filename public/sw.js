const VERSION = 'arena-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/css/app.css', '/css/animations.css', '/css/splash.css', '/css/controls.css', '/js/app.js', '/js/api.js', '/js/ui.js', '/js/screens/home.js', '/js/dict.js', '/js/i18n/fr.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(request).then(cached => {
    const fresh = fetch(request).then(response => {
      if (response.ok && response.type === 'basic') caches.open(VERSION).then(cache => cache.put(request, response.clone()));
      return response;
    });
    return cached || fresh.catch(() => caches.match('/index.html'));
  }));
});
