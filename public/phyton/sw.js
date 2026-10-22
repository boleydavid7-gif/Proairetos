// Phyton's app shell is scoped to /phyton/. Records live in browser
// storage; this worker only makes the interface open without a connection.
const CACHE = 'phyton-v4';
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

// ---------- Frost tonight, in the background (Android, Periodic Background Sync) ----------
// The page leaves the place, the names of plants outside and the nights it already knows about in Cache Storage
// (see src/phyton/app/background.ts). Woken now and then, this asks Open-Meteo for the next mornings' lows and
// says "Frost tonight" once for a night the page did not know, in the afternoon or evening only.

const OUTSIDE = 'proairetos-phyton-outside';
const FROST_C = 2;

const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

async function checkFrost() {
  const cache = await caches.open(OUTSIDE);
  const saved = await cache.match('/phyton-outside.json');
  if (!saved) return;
  const outside = await saved.json();
  if (!outside.on || !outside.names?.length || typeof outside.lat !== 'number') return;
  const now = new Date();
  const hour = now.getHours();
  if (hour < 12 || hour >= 22) return;
  const today = localDay(now);
  if (outside.away && outside.away.from <= today && today <= outside.away.to) return;
  if ((outside.known || []).includes(today) || (await cache.match(`/phyton-frost-said/${today}`))) return;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${outside.lat}&longitude=${outside.lon}&daily=temperature_2m_min&forecast_days=2&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) return;
  const data = await response.json();
  // Tonight's frost shows in tomorrow's low.
  const low = data?.daily?.temperature_2m_min?.[1];
  if (typeof low !== 'number' || low > FROST_C) return;
  const shown = outside.unit === 'F' ? `${Math.round(low * 9 / 5 + 32)}°F` : `${Math.round(low)}°C`;
  await self.registration.showNotification(`Frost tonight, ${shown}`, {
    body: `Outside: ${outside.names.join(', ')}.`,
    icon: '/phyton/icons/icon-192.png',
    badge: '/phyton/icons/icon-192.png',
    tag: `phyton-frost-${today}`,
    data: { url: '/phyton/' },
  });
  await cache.put(`/phyton-frost-said/${today}`, new Response('1'));
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'phyton-weather') event.waitUntil(checkFrost().catch(() => undefined));
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).pathname.startsWith('/phyton/') && 'focus' in client);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
