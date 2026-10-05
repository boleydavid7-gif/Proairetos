// Hydros service worker: keep the app usable offline without pinning users to an old shell.
const CACHE = 'hydros-v13';
const SHELL = ['/hydros/', '/hydros/index.html', '/hydros/manifest.webmanifest', '/hydros/icon.svg', '/hydros/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map(async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) await cache.put(url, response);
      })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('hydros-') && key !== CACHE).map((key) => caches.delete(key))))
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
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put('/hydros/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/hydros/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never let an old worker answer its own update check from its cache.
  if (url.pathname === '/hydros/sw.js') return;
  if (request.mode === 'navigate' || url.pathname === '/hydros/' || url.pathname === '/hydros/index.html') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/hydros/')) {
    event.respondWith(cacheFirst(request));
  }
});
