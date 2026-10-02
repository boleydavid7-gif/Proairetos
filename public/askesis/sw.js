// Askesis service worker: lets the app open and work without a connection.
// Scoped to /askesis/. Workouts live in IndexedDB on the device; this only caches the app.
const CACHE = 'askesis-v1';
const SHELL = ['/askesis/', '/askesis/manifest.webmanifest', '/askesis/icon.svg', '/askesis/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('askesis-') && key !== CACHE).map((key) => caches.delete(key))))
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

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put('/askesis/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/askesis/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  // The app's scripts, styles, fonts and photos (hashed names), and its icons.
  // The bell comes from Proairetos's sounds and is fetched as needed.
  if ((url.pathname.startsWith('/assets/') || url.pathname.startsWith('/askesis/')) && url.pathname !== '/askesis/sw.js') {
    event.respondWith(cacheFirst(request));
  }
});
