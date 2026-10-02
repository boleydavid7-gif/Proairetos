// Proairetos service worker: lets the app open and work without a connection.
// Data lives in IndexedDB on the device; this only caches the app itself.
const CACHE = 'proairetos-v10';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('proairetos-v') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // A missing file can come back as the app page; never keep that in place of a script or style.
  const isPage = (response.headers.get('content-type') || '').includes('text/html');
  if ((response.ok && !isPage) || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// Plain pages that are not the app (privacy). They are cached as themselves,
// never in place of the app page.
const STATIC_PAGES = ['/privacy', '/privacy.html'];

async function networkFirst(request) {
  const path = new URL(request.url).pathname;
  const key = STATIC_PAGES.includes(path) ? request : '/index.html';
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(key, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(key)) ?? (await caches.match('/index.html')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Askesis, the training app, has its own service worker and cache.
  if (url.origin === self.location.origin && url.pathname.startsWith('/askesis')) return;

  // Pages: fresh when online, cached when not.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Built assets have content hashes in their names, so a cached copy never goes stale.
  const sameOrigin = url.origin === self.location.origin;
  // /api/ answers are live (other calendars), never cached. Meditate keeps its
  // own recordings (music streams with range requests, which a cache answers badly).
  if (sameOrigin && url.pathname !== '/sw.js' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sounds/')) {
    event.respondWith(cacheFirst(request));
  }
});

// ---------- Private reminders ----------
// Pushes arrive empty. The server knows only that a reminder is due, never
// what it is about, so the notification says so plainly; details are in the app.

// The app keeps the next two weeks of notices in Cache Storage, written on
// the device (see src/app/notify). A push only says "now"; the words come
// from there, so the server never sees them. Anything due within the last
// hour that has not been shown yet is shown now; each notice's tag is its
// key, so one shown by the open app as well appears once.
const NOTIFY_CACHE = 'proairetos-notify';
const UPCOMING = '/__notify/upcoming.json';
const SHOWN = '/__notify/shown.json';

async function readJson(cache, path, fallback) {
  try {
    const response = await cache.match(path);
    return response ? await response.json() : fallback;
  } catch {
    return fallback;
  }
}

async function showDue() {
  const cache = await caches.open(NOTIFY_CACHE);
  const upcoming = await readJson(cache, UPCOMING, []);
  const shown = new Set(await readJson(cache, SHOWN, []));
  const now = Date.now();
  const due = upcoming.filter((notice) => {
    const at = Date.parse(notice.at);
    return at <= now + 90_000 && at >= now - 60 * 60_000 && !shown.has(notice.key);
  });
  if (due.length === 0) {
    // Nothing found on the device (stored before an update, or cleared): still say something gentle.
    await self.registration.showNotification('Proairetos', {
      body: 'Something you chose is ready.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'proairetos-reminder',
    });
    return;
  }
  for (const notice of due) {
    await self.registration.showNotification(notice.title, {
      body: notice.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: notice.key,
      timestamp: Date.parse(notice.at),
      data: { open: notice.open },
    });
    shown.add(notice.key);
  }
  await cache.put(SHOWN, new Response(JSON.stringify([...shown].slice(-300)), { headers: { 'content-type': 'application/json' } }));
}

self.addEventListener('push', (event) => {
  event.waitUntil(showDue());
});

// A tap opens the app where the notice belongs: the item, the day, or Today.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const open = (event.notification.data && event.notification.data.open) || 'today';
  const target = '/?open=' + encodeURIComponent(open);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const client = windows.find((each) => 'focus' in each);
      if (client) {
        client.postMessage({ type: 'open', open });
        return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
