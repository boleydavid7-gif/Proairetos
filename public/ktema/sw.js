// Ktema's app shell is scoped to /ktema/. Records live in browser
// storage; this worker only makes the interface open without a connection.
const CACHE = 'ktema-v3';
const SHELL = ['/ktema/', '/ktema/index.html', '/ktema/manifest.webmanifest', '/ktema/icon.svg', '/ktema/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ktema-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
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
      cache.put('/ktema/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/ktema/')) ?? Response.error();
  }
}


// Files shared into the app from another (Android, computers: the manifest's share_target). They wait in a cache
// for the page, which takes them out on opening.
function takeShare(event, app, open) {
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const cache = await caches.open('proairetos-share-inbox');
      const files = form.getAll('files').filter((file) => typeof file === 'object');
      await Promise.all(files.map((file, i) => cache.put(`/share-inbox/${app}/${Date.now()}-${i}`, new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream', 'x-name': encodeURIComponent(file.name || 'shared') } }))));
    } catch {
      // Nothing readable was shared; the app opens as usual.
    }
    return Response.redirect(`/${app}/?open=${open}`, 303);
  })());
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method === 'POST' && new URL(request.url).pathname === '/ktema/share') return takeShare(event, 'ktema', 'shared');
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (new URL(request.url).pathname.startsWith('/assets/') || new URL(request.url).pathname.startsWith('/ktema/')) {
    event.respondWith(cacheFirst(request));
  }
});
