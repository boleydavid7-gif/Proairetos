// Proairetos service worker: lets the app open and work without a connection.
// Data lives in IndexedDB on the device; this only caches the app itself.
const CACHE = 'proairetos-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    return (await caches.match('/index.html')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Pages: fresh when online, cached when not.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Built assets have content hashes in their names, so a cached copy never goes stale.
  const sameOrigin = url.origin === self.location.origin;
  if ((sameOrigin && url.pathname !== '/sw.js') || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }
});

// ---------- Private reminders ----------
// Pushes arrive empty. The server knows only that a reminder is due, never
// what it is about, so the notification says so plainly; details are in the app.

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Proairetos', {
      body: 'Something you chose is ready.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'proairetos-reminder',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
