// Oikonomia's app shell is scoped to /oikonomia/. Bills live in the shared
// IndexedDB; this worker only makes the interface open without a connection.
const CACHE = 'oikonomia-v1';
const SHELL = ['/oikonomia/', '/oikonomia/index.html', '/oikonomia/manifest.webmanifest', '/oikonomia/icon.svg', '/oikonomia/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('oikonomia-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && !(response.headers.get('content-type') || '').includes('text/html')) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put('/oikonomia/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/oikonomia/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (new URL(request.url).pathname.startsWith('/assets/') || new URL(request.url).pathname.startsWith('/oikonomia/')) {
    event.respondWith(cacheFirst(request));
  }
});
