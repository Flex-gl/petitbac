const VERSION = 'arena-shell-v13';
const SHELL = ['/', '/index.html', '/version.json', '/manifest.webmanifest', '/css/app.css', '/css/animations.css', '/css/splash.css', '/css/controls.css', '/css/inter.css', '/js/app.js', '/js/version.js', '/js/api.js', '/js/ui.js', '/js/inter-session.js', '/js/inter-audio.js', '/js/screens/home.js', '/js/screens/inter.js', '/js/dict.js', '/js/i18n/fr.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()).then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then(clients => Promise.all(clients.map(async client => { client.postMessage({ type: 'UPDATE_READY', version: VERSION }); if (client.url) await client.navigate(client.url); }))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match(request)) || cache.match('/index.html');
    }
  })());
});
