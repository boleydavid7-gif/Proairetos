// Phyton's app shell is scoped to /phyton/. Records live in browser
// storage; this worker only makes the interface open without a connection.
const CACHE = 'phyton-v1';
const SHELL = ['/phyton/', '/phyton/index.html', '/phyton/manifest.webmanifest', '/phyton/icon.svg', '/phyton/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('phyton-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
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
      cache.put('/phyton/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/phyton/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (new URL(request.url).pathname.startsWith('/assets/') || new URL(request.url).pathname.startsWith('/phyton/')) {
    event.respondWith(cacheFirst(request));
  }
});
