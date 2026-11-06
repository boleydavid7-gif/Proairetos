/*
 * Storage diagnostic (temporary). Finds out which storage an iPhone's Home Screen apps share with each other and with
 * Safari. It writes small marks that start with "proairetosDiag" / "proairetos-diag", reads every mark it can see, and
 * removes them all on request. It touches no other key, database, cache, worker or cookie, and never signs in or syncs.
 * Delete public/lab/diag and scripts/diag when the results are in.
 */
(() => {
  'use strict';
  const APP = document.documentElement.dataset.diag || 'unknown';
  const KEY = 'proairetosDiag';
  const SELF = KEY + '.self';
  const MARK = KEY + '.mark.' + APP;
  const DB = 'proairetos-diag';
  const CACHE = 'proairetos-diag-' + APP;
  const COOKIE = 'proairetosDiag_' + APP;
  const CHANNEL = 'proairetos-diag';
  const heard = [];
  const errors = [];
  let channel;
  let installId = '';

  const $ = (id) => document.getElementById(id);
  const now = () => new Date().toISOString();
  const attempt = async (label, fn, fallback) => {
    try {
      return await fn();
    } catch (error) {
      errors.push(label + ': ' + (error && error.message ? error.message : String(error)));
      return fallback;
    }
  };

  const identity = () => {
    let id = '';
    try {
      id = localStorage.getItem(SELF) || '';
      if (!id) {
        id = Math.random().toString(36).slice(2, 8);
        localStorage.setItem(SELF, id);
      }
    } catch {
      id = 'no-localStorage';
    }
    return id;
  };

  const mark = () => ({ app: APP, install: installId, at: now(), standalone: standalone() });
  const standalone = () => Boolean(navigator.standalone) || matchMedia('(display-mode: standalone)').matches;

  // ---- writing ----
  const openDb = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('marks');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  async function write() {
    const value = mark();
    await attempt('localStorage write', () => localStorage.setItem(MARK, JSON.stringify(value)));
    await attempt('IndexedDB write', async () => {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('marks', 'readwrite');
        tx.objectStore('marks').put(value, APP);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await attempt('Cache Storage write', async () => {
      const cache = await caches.open(CACHE);
      await cache.put('/lab/diag/marker/' + APP, new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } }));
    });
    await attempt('cookie write', () => {
      document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify({ install: installId, at: value.at })) + '; Path=/; Max-Age=86400; SameSite=Lax';
    });
    await attempt('BroadcastChannel post', () => channel && channel.postMessage({ type: 'mark', ...value }));
    await attempt('service worker register', () => navigator.serviceWorker.register('/lab/diag/' + APP + '/sw.js', { scope: '/lab/diag/' + APP + '/' }));
  }

  // ---- reading ----
  async function read() {
    const out = { localStorage: [], indexedDB: [], cacheStorage: [], cookies: [] };
    await attempt('localStorage read', () => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(KEY + '.mark.')) out.localStorage.push(JSON.parse(localStorage.getItem(key)));
      }
    });
    await attempt('IndexedDB read', async () => {
      const db = await openDb();
      out.indexedDB = await new Promise((resolve, reject) => {
        const request = db.transaction('marks').objectStore('marks').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
    });
    await attempt('Cache Storage read', async () => {
      for (const name of await caches.keys()) {
        if (!name.startsWith('proairetos-diag-')) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const response = await cache.match(request);
          out.cacheStorage.push(await response.json());
        }
      }
    });
    await attempt('cookie read', () => {
      for (const part of document.cookie.split('; ')) {
        if (!part.startsWith('proairetosDiag_')) continue;
        const [name, raw] = part.split('=');
        out.cookies.push({ app: name.replace('proairetosDiag_', ''), ...JSON.parse(decodeURIComponent(raw)) });
      }
    });
    return out;
  }

  async function environment() {
    const estimate = await attempt('storage estimate', () => navigator.storage.estimate(), null);
    const persisted = await attempt('storage persisted', () => navigator.storage.persisted(), null);
    const registrations = await attempt('service worker list', async () => {
      const all = await navigator.serviceWorker.getRegistrations();
      return all.map((each) => ({ scope: each.scope, script: (each.active || each.waiting || each.installing || {}).scriptURL || '', state: (each.active || each.waiting || each.installing || {}).state || '' }));
    }, []);
    const cacheNames = await attempt('cache names', () => caches.keys(), []);
    return {
      displayMode: standalone() ? 'standalone' : 'browser',
      navigatorStandalone: navigator.standalone === undefined ? 'unsupported' : navigator.standalone,
      mediaQueries: ['standalone', 'minimal-ui', 'fullscreen', 'browser'].filter((mode) => matchMedia('(display-mode: ' + mode + ')').matches),
      userAgent: navigator.userAgent,
      location: location.href,
      referrer: document.referrer || '',
      storageUsageBytes: estimate ? estimate.usage : null,
      storageQuotaBytes: estimate ? estimate.quota : null,
      storagePersisted: persisted,
      controller: (navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL) || '',
      serviceWorkers: registrations,
      cacheNames,
      cookieNames: document.cookie.split('; ').map((part) => part.split('=')[0]).filter(Boolean),
      localStorageKeyCount: (() => { try { return localStorage.length; } catch { return null; } })(),
    };
  }

  const names = (rows) => rows.map((row) => row.app + (row.install === installId ? ' (this install)' : ' [' + row.install + ']')).join(', ') || 'none';

  async function report() {
    const [seen, env] = [await read(), await environment()];
    return {
      tool: 'proairetos-diag',
      version: 1,
      at: now(),
      thisPage: APP,
      installId,
      environment: env,
      marksSeen: seen,
      broadcastHeard: heard.slice(-20),
      errors: errors.slice(),
    };
  }

  const line = (label, value) => '<tr><th scope="row">' + label + '</th><td>' + value + '</td></tr>';
  const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  async function show() {
    const r = await report();
    const e = r.environment;
    $('table').innerHTML =
      line('This page', esc(r.thisPage + ', install ' + r.installId)) +
      line('Display mode', esc(e.displayMode + ' (navigator.standalone: ' + e.navigatorStandalone + ')')) +
      line('localStorage marks', esc(names(r.marksSeen.localStorage))) +
      line('IndexedDB marks', esc(names(r.marksSeen.indexedDB))) +
      line('Cache Storage marks', esc(names(r.marksSeen.cacheStorage))) +
      line('Cookies', esc(names(r.marksSeen.cookies))) +
      line('Broadcast heard', esc(r.broadcastHeard.map((h) => h.app + ' [' + h.install + ']').join(', ') || 'nothing yet')) +
      line('Service workers seen', esc(e.serviceWorkers.map((w) => w.scope).join(', ') || 'none')) +
      line('Caches seen', esc(e.cacheNames.join(', ') || 'none')) +
      line('Storage used / allowed', esc((e.storageUsageBytes === null ? 'unknown' : e.storageUsageBytes + ' bytes') + ' / ' + (e.storageQuotaBytes === null ? 'unknown' : e.storageQuotaBytes + ' bytes') + ', persisted: ' + e.storagePersisted)) +
      line('Errors', esc(r.errors.join('; ') || 'none'));
    $('json').value = JSON.stringify(r, null, 2);
    return r;
  }

  // ---- export ----
  async function copy() {
    const text = $('json').value;
    try {
      await navigator.clipboard.writeText(text);
      say('Copied.');
    } catch {
      $('json').focus();
      $('json').select();
      say('Select all in the box below and copy it.');
    }
  }

  function save() {
    const blob = new Blob([$('json').value], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'storage-diagnostic-' + APP + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }

  // ---- cleanup: only what starts with the diagnostic's own names ----
  async function clean() {
    let removed = 0;
    await attempt('localStorage clean', () => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(KEY)) {
          localStorage.removeItem(key);
          removed += 1;
        }
      }
    });
    await attempt('IndexedDB clean', () => new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB);
      request.onsuccess = () => { removed += 1; resolve(); };
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    }));
    await attempt('Cache Storage clean', async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('proairetos-diag-') && (await caches.delete(name))) removed += 1;
      }
    });
    await attempt('cookie clean', () => {
      for (const part of document.cookie.split('; ')) {
        const name = part.split('=')[0];
        if (name.startsWith('proairetosDiag_')) {
          document.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax';
          removed += 1;
        }
      }
    });
    await attempt('service worker clean', async () => {
      for (const each of await navigator.serviceWorker.getRegistrations()) {
        if (new URL(each.scope).pathname.startsWith('/lab/diag/') && (await each.unregister())) removed += 1;
      }
    });
    heard.length = 0;
    await show();
    say('Removed ' + removed + ' diagnostic item' + (removed === 1 ? '' : 's') + '. Nothing else was touched.');
  }

  function say(text) {
    $('note').textContent = text;
  }

  async function start() {
    installId = identity();
    await attempt('BroadcastChannel open', () => {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => {
        const data = event.data || {};
        if (data.type === 'hello') channel.postMessage({ type: 'here', ...mark() });
        if (data.type === 'here' || data.type === 'mark') {
          heard.push({ app: data.app, install: data.install, at: now() });
          void show();
        }
      };
      channel.postMessage({ type: 'hello', ...mark() });
    });
    $('write').addEventListener('click', async () => { await write(); await show(); say('Marks written here. Open the other diagnostic apps and read.'); });
    $('read').addEventListener('click', async () => { channel && channel.postMessage({ type: 'hello', ...mark() }); await show(); say('Read at ' + now() + '.'); });
    $('copy').addEventListener('click', copy);
    $('save').addEventListener('click', save);
    $('clean').addEventListener('click', clean);
    await show();
  }

  void start();
})();
