// SOMA service worker: lets the app open and work without a connection.
// Scoped to /soma/. Recipes live in IndexedDB on the device; this only caches the app.
const CACHE = 'soma-v1';
// Photos of produce from TheMealDB, kept once seen so In season shows them offline. Kept across app updates.
const PHOTOS = 'produce-photos';
const SHELL = ['/soma/', '/soma/manifest.webmanifest', '/soma/icon.svg', '/soma/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('soma-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const isPage = (response.headers.get('content-type') || '').includes('text/html');
  if (response.ok && !isPage) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function keptPhoto(request) {
  const cache = await caches.open(PHOTOS);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put('/soma/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/soma/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === 'www.themealdb.com' && url.pathname.startsWith('/images/ingredients/')) {
    event.respondWith(keptPhoto(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  // The app's scripts, styles, fonts and photos (hashed names), and its icons.
  if ((url.pathname.startsWith('/assets/') || url.pathname.startsWith('/soma/')) && url.pathname !== '/soma/sw.js') {
    event.respondWith(cacheFirst(request));
  }
});
