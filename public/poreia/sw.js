const CACHE = 'poreia-v2';
const SHELL = ['/poreia/', '/poreia/index.html', '/poreia/manifest.webmanifest', '/poreia/icon.svg', '/poreia/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

// The map's tiles, fonts and symbols, kept so a trip's map still draws without a connection.
const MAP = 'poreia-map';
const MAP_HOST = 'tiles.openfreemap.org';

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('poreia-') && key !== CACHE && key !== MAP).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

// Styles and the tile index change as the map is updated: fresh when online, kept for offline. Tiles, fonts and
// symbols are fixed at their address: kept and used first.
async function mapRequest(request) {
  const cache = await caches.open(MAP);
  const fixed = /\.(pbf|png|webp)$/.test(new URL(request.url).pathname);
  if (fixed) {
    const kept = await cache.match(request);
    if (kept) return kept;
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const kept = await cache.match(request);
    if (kept) return kept;
    throw error;
  }
}

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
      cache.put('/poreia/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/poreia/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method === 'GET' && new URL(request.url).host === MAP_HOST) {
    event.respondWith(mapRequest(request));
    return;
  }
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (new URL(request.url).pathname.startsWith('/assets/') || new URL(request.url).pathname.startsWith('/poreia/')) event.respondWith(cacheFirst(request));
});
