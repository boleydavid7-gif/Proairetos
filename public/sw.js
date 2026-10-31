// Proairetos service worker: lets the app open and work without a connection.
// Data lives in IndexedDB on the device; this only caches the app itself.
const CACHE = 'proairetos-v19';
const APP_PATHS = ['/askesis/','/soma/','/oikonomia/','/hydros/','/praxis/','/theoria/','/diaita/','/philia/','/ergon/','/therapeia/','/dynamis/','/ktema/','/phyton/','/poreia/','/mneme/'];
const SHELL = ['/','/index.html','/manifest.webmanifest','/favicon.svg','/icons/icon-192.png', ...APP_PATHS];

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
const STATIC_PAGES = ['/privacy', '/privacy.html', '/welcome', '/welcome/', '/welcome/index.html', '/storage-connected/', '/storage-connected/index.html', ...APP_PATHS];

async function networkFirst(request) {
  const path = new URL(request.url).pathname;
  // By path, so /praxis/?open=start still finds the page offline.
  // The front page's pages (/welcome/soma/, /welcome/thanks/) are kept as themselves too.
  const key = STATIC_PAGES.includes(path) || path.startsWith('/welcome/') ? path : '/index.html';
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
  const { request } = event;
  // Theoria uses this worker: a book shared into it.
  if (request.method === 'POST' && new URL(request.url).pathname === '/theoria/share') return takeShare(event, 'theoria', 'add');
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // The Lamplight guide is a separate plain page; leave its own assets alone.
  if (url.origin === self.location.origin && /^\/lamplight(\/|$)/.test(url.pathname)) return;
  // Pages: fresh when online, cached when not.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Built assets have content hashes in their names, so a cached copy never goes stale.
  const sameOrigin = url.origin === self.location.origin;
  // /api/ answers are live (other calendars), never cached. Meditate keeps its
  // own recordings (music streams with range requests, which a cache answers badly).
  if (sameOrigin && url.pathname !== '/sw.js' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sounds/') && !url.pathname.startsWith('/ocr/') && !url.pathname.startsWith('/ort/')) {
    event.respondWith(cacheFirst(request));
  }
});

// ---------- Private reminders ----------
// The server carries sealed words with a push. This worker opens them on the
// device, so a reminder can keep its app name, icon and chosen lock-screen detail.

// The app keeps the next two weeks of notices in Cache Storage, written on
// the device (see src/app/notify). The sealed words come from there, so the
// server never sees them. Anything due within the last
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

const APP_NAMES = {
  proairetos: 'Proairetos', askesis: 'Askesis', oikonomia: 'Oikonomia', hydros: 'Hydros', praxis: 'Theoria', diaita: 'Diaita',
  philia: 'Philia', ergon: 'Ergon', therapeia: 'Therapeia', dynamis: 'Dynamis', ktema: 'Ktema', phyton: 'Phyton', poreia: 'Poreia',
};

function appFor(open) {
  if (open === 'askesis' || (open && open.startsWith('askesis:'))) return 'askesis';
  if (open === 'oikonomia' || (open && open.startsWith('oikonomia:'))) return 'oikonomia';
  if (open === 'hydros' || (open && open.startsWith('hydros:'))) return 'hydros';
  if (open === 'praxis' || (open && open.startsWith('praxis:'))) return 'praxis';
  for (const app of ['diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia']) if (open === app || (open && open.startsWith(app + ':'))) return app;
  return 'proairetos';
}

function appNameFor(open) {
  return APP_NAMES[appFor(open)];
}

function iconFor(open) {
  const app = appFor(open) === 'praxis' ? 'theoria' : appFor(open);
  return app === 'proairetos' ? '/icons/icon-192.png' : '/' + app + '/icons/icon-192.png';
}

function bodyFor(notice) {
  return notice.title === appNameFor(notice.open) ? notice.body : [notice.title, notice.body].filter(Boolean).join(' · ');
}

// The account key, kept on this device by sync (database `proairetos`, store `syncMeta`), opens the words that
// another app of the family sealed for this push. The server only ever carried them sealed.
function accountKey() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('proairetos');
      request.onerror = () => resolve(null);
      // Opened without a version: on a device that never synced it would make an empty database, so stop there.
      request.onupgradeneeded = () => request.transaction.abort();
      request.onsuccess = () => {
        const db = request.result;
        try {
          if (!db.objectStoreNames.contains('syncMeta')) {
            db.close();
            return resolve(null);
          }
          const get = db.transaction('syncMeta', 'readonly').objectStore('syncMeta').get('dataKey');
          get.onsuccess = () => {
            db.close();
            resolve((get.result && get.result.value) || null);
          };
          get.onerror = () => resolve(null);
        } catch {
          db.close();
          resolve(null);
        }
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

async function showDue(sealed, fallback) {
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
    // Nothing found on the device: retain the app label from a declarative push when one was supplied.
    await self.registration.showNotification(fallback?.title || 'Proairetos', {
      body: fallback?.body || 'You have a reminder.',
      icon: fallback?.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'proairetos-reminder',
      data: { open: fallback?.open || 'today' },
    });
    return;
  }
  for (const notice of due) {
    await self.registration.showNotification(appNameFor(notice.open), {
      body: bodyFor(notice),
      icon: iconFor(notice.open),
      badge: '/icons/icon-192.png',
      tag: notice.key,
      timestamp: Date.parse(notice.at),
      data: { open: notice.open },
      // A reminder for a to-do can be marked done from the notice itself (Android and computers show the button).
      actions: String(notice.open).startsWith('item:') ? [{ action: 'done', title: 'Done' }] : [],
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

function fallbackIn(event) {
  try {
    const payload = event.data ? event.data.json() : null;
    const notice = payload && payload.notification;
    if (!notice) return undefined;
    const app = appFor(notice.open || 'today');
    return { title: notice.title || APP_NAMES[app], body: notice.body || 'You have a reminder.', icon: notice.icon || iconFor(notice.open || 'today'), open: notice.open || app };
  } catch {
    return undefined;
  }
}

self.addEventListener('push', (event) => {
  // A Declarative Web Push (Safari 18.4+) arrives with its own plain notice, shown by the phone if this worker shows
  // nothing; showDue shows the person's own words in its place.
  event.waitUntil(
    showDue(sealedIn(event), fallbackIn(event)).catch(() =>
      // A phone stops sending to a worker that shows nothing, so even a failure here shows the plain line.
      self.registration.showNotification('Proairetos', { body: 'You have a reminder.', icon: '/icons/icon-192.png', tag: 'proairetos-reminder' }),
    ),
  );
});

// A tap opens the app where the notice belongs: the item, the day or Today in Proairetos; a reading block in
// Theoria, Askesis or a bill in Oikonomia in their own app. An open window of that app is brought forward.
const APPS = ['/askesis/', '/soma/', '/oikonomia/', '/hydros/', '/praxis/', '/theoria/', '/diaita/', '/philia/', '/ergon/', '/therapeia/', '/dynamis/', '/ktema/', '/phyton/', '/poreia/'];

function placeFor(open) {
  if (open === 'praxis') return { app: '/theoria/', url: '/theoria/?open=pomodoro' };
  if (open === 'askesis') return { app: '/askesis/', url: '/askesis/' };
  if (open.startsWith('oikonomia:')) return { app: '/oikonomia/', url: '/oikonomia/?open=' + encodeURIComponent(open.slice(10)) };
  for (const app of ['diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia']) {
    if (open === app) return { app: '/' + app + '/', url: '/' + app + '/' };
    if (open.startsWith(app + ':')) return { app: '/' + app + '/', url: '/' + app + '/?open=' + encodeURIComponent(open.slice(app.length + 1)) };
  }
  return { app: '/', url: '/?open=' + encodeURIComponent(open) };
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tapped = (event.notification.data && event.notification.data.open) || 'today';
  // "Done" on a to-do's reminder: Proairetos marks it done (with undo) instead of opening the item.
  const open = event.action === 'done' && tapped.startsWith('item:') ? 'done:' + tapped : tapped;
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
