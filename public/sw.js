// Proairetos service worker: lets the app open and work without a connection.
// Data lives in IndexedDB on the device; this only caches the app itself.
const CACHE = 'proairetos-v15';
const SHELL = ['/','/index.html','/manifest.webmanifest','/favicon.svg','/icons/icon-192.png','/praxis/manifest.webmanifest','/praxis/icons/icon-192.png','/praxis/icons/icon-512.png','/praxis/icons/apple-touch-icon.png','/theoria/manifest.webmanifest','/theoria/icons/icon-192.png','/theoria/icons/icon-512.png','/theoria/icons/apple-touch-icon.png'];

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
const STATIC_PAGES = ['/privacy', '/privacy.html', '/welcome', '/welcome/', '/welcome/index.html', '/praxis', '/praxis/', '/theoria', '/theoria/'];

async function networkFirst(request) {
  const path = new URL(request.url).pathname;
  // By path, so /praxis/?open=start still finds the page offline.
  const key = STATIC_PAGES.includes(path) ? path : '/index.html';
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
  if (url.origin === self.location.origin && (url.pathname.startsWith('/askesis') || url.pathname.startsWith('/soma'))) return;

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

// Each app's own mark beside its reminders (HYDROS has only its drawn icon, so it shares Proairetos's).
function iconFor(open) {
  if (open === 'praxis') return '/praxis/icons/icon-192.png';
  if (open === 'askesis') return '/askesis/icons/icon-192.png';
  if (open && open.startsWith('oikonomia:')) return '/oikonomia/icons/icon-192.png';
  return '/icons/icon-192.png';
}

// The account key, kept on this device by sync (database `proairetos`, store `syncMeta`), opens the words that
// another app of the family sealed for this push. The server only ever carried them sealed.
function accountKey() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('proairetos');
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('syncMeta')) return resolve(null);
        const get = db.transaction('syncMeta', 'readonly').objectStore('syncMeta').get('dataKey');
        get.onsuccess = () => resolve((get.result && get.result.value) || null);
        get.onerror = () => resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function openSealed(sealed) {
  const key = await accountKey();
  if (!key || !Array.isArray(sealed)) return [];
  const opened = [];
  for (const text of sealed) {
    try {
      const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode('proairetos-notice') },
        key,
        bytes.slice(12),
      );
      const words = JSON.parse(new TextDecoder().decode(plain));
      opened.push({ key: words.k, title: words.t, body: words.b, open: words.o, at: new Date().toISOString() });
    } catch {
      // Sealed with another key (signed in elsewhere since): the stored words below may still have it.
    }
  }
  return opened;
}

async function showDue(sealed) {
  const cache = await caches.open(NOTIFY_CACHE);
  const upcoming = await readJson(cache, UPCOMING, []);
  const shown = new Set(await readJson(cache, SHOWN, []));
  const now = Date.now();
  const stored = upcoming.filter((notice) => {
    const at = Date.parse(notice.at);
    return at <= now + 90_000 && at >= now - 60 * 60_000;
  });
  const due = [];
  for (const notice of [...stored, ...(await openSealed(sealed))]) {
    if (shown.has(notice.key) || due.some((each) => each.key === notice.key)) continue;
    due.push(notice);
  }
  if (due.length === 0 && stored.length > 0) {
    // The open app showed it already. A phone expects every push to show something, so show it again under
    // the same tag, which replaces it rather than adding a second.
    due.push(stored[stored.length - 1]);
  }
  if (due.length === 0) {
    // Nothing found on the device (stored before an update, or cleared): still say something gentle.
    await self.registration.showNotification('Proairetos', {
      body: 'You have a reminder.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'proairetos-reminder',
    });
    return;
  }
  for (const notice of due) {
    await self.registration.showNotification(notice.title, {
      body: notice.body,
      icon: iconFor(notice.open),
      badge: '/icons/icon-192.png',
      tag: notice.key,
      timestamp: Date.parse(notice.at),
      data: { open: notice.open },
    });
    shown.add(notice.key);
  }
  await cache.put(SHOWN, new Response(JSON.stringify([...shown].slice(-300)), { headers: { 'content-type': 'application/json' } }));
}

function sealedIn(event) {
  try {
    const payload = event.data ? event.data.json() : null;
    return payload && payload.v === 1 ? payload.n : undefined;
  } catch {
    return undefined;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(showDue(sealedIn(event)));
});

// A tap opens the app where the notice belongs: the item, the day or Today in Proairetos; HYDROS, Praxis,
// Askesis or a bill in Oikonomia in their own app. An open window of that app is brought forward.
const APPS = ['/askesis/', '/soma/', '/oikonomia/', '/hydros/', '/praxis/', '/theoria/'];

function placeFor(open) {
  if (open === 'hydros') return { app: '/hydros/', url: '/hydros/' };
  if (open === 'praxis') return { app: '/praxis/', url: '/praxis/' };
  if (open === 'askesis') return { app: '/askesis/', url: '/askesis/' };
  if (open.startsWith('oikonomia:')) return { app: '/oikonomia/', url: '/oikonomia/?open=' + encodeURIComponent(open.slice(10)) };
  return { app: '/', url: '/?open=' + encodeURIComponent(open) };
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const open = (event.notification.data && event.notification.data.open) || 'today';
  const place = placeFor(open);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const path = (client) => new URL(client.url).pathname;
      const mine = windows.filter((client) =>
        place.app === '/' ? !APPS.some((app) => path(client).startsWith(app)) : path(client).startsWith(place.app),
      );
      const client = mine.find((each) => 'focus' in each);
      // Proairetos follows the message where it is; another app is simply brought forward.
      if (client && place.app === '/') {
        client.postMessage({ type: 'open', open });
        return client.focus();
      }
      if (client && place.url === place.app) return client.focus();
      return self.clients.openWindow(place.url);
    }),
  );
});
