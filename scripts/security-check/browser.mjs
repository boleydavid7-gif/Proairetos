// The shared security service in a real browser, against the dev server (it serves the source modules the pages import):
//   npx vite --port 5199 &   then   BASE=http://localhost:5199 CHROMIUM=... node scripts/security-check/browser.mjs
// It makes a vault in one page, and checks what the other open pages (Proairetos and companion apps) and a browser
// that has no vault do. It uses a throwaway browser profile and a made-up account; nothing is sent anywhere.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:5199';
const PASS = 'a long passphrase for tests';
const APPS = ['', 'askesis', 'soma', 'oikonomia', 'hydros', 'theoria', 'poreia', 'therapeia', 'dynamis', 'ktema', 'philia', 'ergon', 'phyton', 'diaita', 'mneme', 'melete'];
const results = [];
const check = (name, ok, detail = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const seed = async (context) => {
  const page = await context.newPage();
  await page.goto(`${BASE}/welcome/`);
  await page.evaluate(() => {
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
  });
  await page.close();
};
const phase = (page) => page.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.status().phase);
const text = (page) => page.evaluate(() => document.body.innerText);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const errors = [];
const open = async (context, path) => {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${path}: ${String(error).slice(0, 120)}`));
  await page.goto(`${BASE}/${path}${path ? '/' : ''}`);
  await page.waitForTimeout(1500);
  return page;
};

// ---- 1. No vault: nothing changes, nothing is stored ----
{
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
  await seed(context);
  const page = await open(context, '');
  check('no vault: the app opens normally, with no lock', !(await text(page)).includes('Locked') && (await phase(page)) === 'none');
  const stored = await page.evaluate(async () => ({ header: localStorage.getItem('proairetosVault'), dbs: (await indexedDB.databases()).map((db) => db.name) }));
  check('no vault: nothing is stored for one', stored.header === null && !stored.dbs.includes('proairetos-vault'), JSON.stringify(stored.dbs));
  await context.close();
}

// ---- 2. A vault, in Proairetos and in companion apps ----
const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
await seed(context);
const home = await open(context, '');
const soma = await open(context, 'soma');
const ktema = await open(context, 'ktema');
const hydros = await open(context, 'hydros');

const made = await home.evaluate(async (pass) => {
  const keys = await import('/src/data/sync/keys.ts');
  const { security } = await import('/src/app/security/securityService.ts');
  const setup = await keys.createKeys(pass);
  await security.createFromAccountKey(setup.dataKey, { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] });
  const sealed = await keys.sealRecord(security.key(), 'local:items', 'a', { title: 'sealed in the first page' });
  window.__proof = { sealed, recovery: setup.recoveryKey };
  return { phase: security.status().phase, recovery: setup.recoveryKey };
}, PASS);
check('the vault is made and unlocked in the first page', made.phase === 'unlocked');
await settle(home, 800);
const others = await Promise.all([soma, ktema, hydros].map(phase));
check('the key object reaches pages that were already open (Proairetos to Soma, Ktema, Hydros)', others.every((p) => p === 'unlocked'), others.join(','));
const opened = await soma.evaluate(async () => {
  const keys = await import('/src/data/sync/keys.ts');
  const { security } = await import('/src/app/security/securityService.ts');
  return keys.openRecord(security.key(), 'local:items', 'a', JSON.parse(sessionStorage.getItem('proof') ?? 'null') ?? undefined).catch(() => null);
});
const proof = await home.evaluate(() => window.__proof.sealed);
const crossOpen = await soma.evaluate(async (sealed) => {
  const keys = await import('/src/data/sync/keys.ts');
  const { security } = await import('/src/app/security/securityService.ts');
  return keys.openRecord(security.key(), 'local:items', 'a', sealed);
}, proof);
check('a value sealed in one page opens in another', crossOpen?.title === 'sealed in the first page');
check('the local key cannot be exported', await home.evaluate(async () => {
  const { security } = await import('/src/app/security/securityService.ts');
  return crypto.subtle.exportKey('raw', security.key()).then(() => false, () => true);
}));

// ---- 3. Locking reaches every page ----
await ktema.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(home, 800);
const locked = await Promise.all([home, soma, ktema, hydros].map(async (p) => ({ phase: await phase(p), screen: (await text(p)).includes('Locked') })));
check('locking in one page locks the others, and each shows the locked screen', locked.every((l) => l.phase === 'locked' && l.screen), JSON.stringify(locked.map((l) => l.phase)));
check('no private screen is left showing while locked', !(await text(home)).match(/Capture|Reflect|Days ahead/) && !(await text(soma)).match(/Recipes/));

// ---- 4. A wrong password, then the right one, in one page ----
await soma.getByLabel('Account password').fill('not the password at all');
await soma.getByRole('button', { name: 'Unlock' }).click();
await settle(soma, 1500);
check('a wrong password is refused and the page stays locked', (await phase(soma)) === 'locked' && (await text(soma)).includes('does not unlock your data'));
await soma.getByLabel('Account password').fill(PASS);
await soma.getByRole('button', { name: 'Unlock' }).click();
await settle(soma, 2000);
await settle(home, 800);
const after = await Promise.all([home, soma, ktema, hydros].map(phase));
check('unlocking once, in one page, opens every page', after.every((p) => p === 'unlocked'), after.join(','));
check('and the screens come back', !(await text(home)).includes('Locked'));

// ---- 5. Opening an app by its own address while locked ----
await home.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(home, 600);
const fresh = [];
for (const app of APPS) {
  const page = await context.newPage();
  await page.goto(`${BASE}/${app}${app ? '/' : ''}`);
  await page.waitForTimeout(1200);
  const body = await text(page);
  fresh.push([app || 'proairetos', body.includes('Locked') && !!(await page.getByLabel('Account password').count())]);
  await page.close();
}
check(`all ${APPS.length} apps, opened by their own address while locked, show the locked screen`, fresh.every(([, ok]) => ok), fresh.filter(([, ok]) => !ok).map(([name]) => name).join(',') || 'all');

// ---- 6. A page that opens locked: the locked screen is the first thing ----
{
  const page = await context.newPage();
  await page.goto(`${BASE}/soma/`, { waitUntil: 'commit' });
  await page.waitForSelector('body *', { timeout: 10000 });
  const firstSeen = await page.evaluate(() => document.body.innerText);
  const ever = await page.evaluate(() => new Promise((resolve) => {
    const seen = [];
    const look = () => seen.push(document.body.innerText.includes('Recipes'));
    new MutationObserver(look).observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => resolve(seen.some(Boolean)), 2500);
  }));
  check('a page that opens while locked never shows the app first', !ever, `first text: ${JSON.stringify(firstSeen.slice(0, 30))}`);
  await page.close();
}

// ---- 7. Unlock with no connection (the page is already loaded; the network is then cut) ----
await soma.bringToFront();
await context.setOffline(true);
let requested = [];
soma.on('request', (request) => requested.push(request.url().replace(BASE, '')));
await soma.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(soma, 600);
check('offline: the locked screen is showing', (await text(soma)).includes('Locked'));
requested.length = 0; // from here, only what unlocking itself does
await soma.getByRole('button', { name: 'Use recovery key' }).click();
await soma.getByLabel('Recovery key').fill(made.recovery);
await soma.getByRole('button', { name: 'Unlock' }).click();
await settle(soma, 2500);
check('offline: the recovery key unlocks', (await phase(soma)) === 'unlocked');
await soma.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(soma, 600);
await soma.getByLabel('Account password').fill(PASS);
await soma.getByRole('button', { name: 'Unlock' }).click();
await settle(soma, 2500);
check('offline: the account password unlocks', (await phase(soma)) === 'unlocked');
// Once the app opens again it makes its own requests (its store check, an icon); none of them is the vault asking a server for anything.
check('offline: unlocking asked no server for a key (the network was cut and it still opened)', !requested.some((url) => /supabase|\/auth\/|\/rest\/|user_keys|passkey/i.test(url)), `the app's own requests on reopening: ${[...new Set(requested)].join(' ') || 'none'}`);
await context.setOffline(false);

// ---- 8. A damaged header ----
await home.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(home, 500);
const good = await home.evaluate(() => localStorage.getItem('proairetosVault'));
await home.evaluate(() => localStorage.setItem('proairetosVault', '{"damaged":'));
const copy = await context.newPage();
await copy.goto(`${BASE}/ergon/`);
await copy.waitForTimeout(1800);
check('one copy of the header damaged: the other is used and the first is repaired', (await text(copy)).includes('Locked') && (await copy.evaluate(() => localStorage.getItem('proairetosVault'))) === good);
await copy.evaluate(async () => {
  localStorage.setItem('proairetosVault', 'garbage');
  const db = await new Promise((res) => { const r = indexedDB.open('proairetos-vault'); r.onsuccess = () => res(r.result); });
  await new Promise((res) => { const tx = db.transaction('header', 'readwrite'); tx.objectStore('header').put('also garbage', 'header'); tx.oncomplete = res; });
  db.close();
});
await copy.reload();
await copy.waitForTimeout(1800);
const damaged = await text(copy);
check('both copies damaged: the page says so and shows no app, and removes nothing', damaged.includes('could not be read') && (await copy.evaluate(() => localStorage.getItem('proairetosVault'))) === 'garbage');
await copy.close();

// ---- 9. Reload: the gate decides from both copies, and never shows the app while it is unsure ----
// An observer installed before the app starts records whether the app was ever in the page (the root has content and no lock screen).
const WATCH = () => {
  window.__appShown = false;
  window.__firstAppAt = null;
  const look = () => {
    const root = document.getElementById('root');
    if (root && root.childElementCount > 0 && !root.querySelector('.locked-screen')) {
      if (!window.__appShown) window.__firstAppAt = Math.round(performance.now());
      window.__appShown = true;
    }
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true });
};
const watched = async (ctx, path, extra) => {
  const page = await ctx.newPage();
  await page.addInitScript(WATCH);
  if (extra) await page.addInitScript(extra);
  page.on('pageerror', (error) => errors.push(`${path}: ${String(error).slice(0, 120)}`));
  await page.goto(`${BASE}/${path}/`);
  await page.waitForTimeout(2200);
  return page;
};
const state = (page) => page.evaluate(() => ({ appEverShown: window.__appShown, locked: document.body.innerText.includes('Locked'), cannotCheck: document.body.innerText.includes('cannot be checked'), unreadable: document.body.innerText.includes('could not be read'), at: window.__firstAppAt }));

// 9a. The vault exists; the browser-storage copy is gone; the database copy is valid. A reload must show locked, never the app.
await home.evaluate(async () => (await import('/src/app/security/securityService.ts')).security.lock());
await settle(home, 400);
// (Section 8 left both copies damaged, so a valid database copy is put back first.)
await home.evaluate(async (good) => {
  const db = await new Promise((res) => { const r = indexedDB.open('proairetos-vault'); r.onsuccess = () => res(r.result); });
  await new Promise((res) => { const tx = db.transaction('header', 'readwrite'); tx.objectStore('header').put(good, 'header'); tx.oncomplete = res; });
  db.close();
  localStorage.removeItem('proairetosVault');
}, good);
{
  const page = await watched(context, 'ergon');
  const st = await state(page);
  check('reload with the browser-storage copy missing and the database copy valid: locked, and the app was never shown', st.locked && !st.appEverShown, JSON.stringify(st));
  check('and the missing copy is written back', (await page.evaluate(() => localStorage.getItem('proairetosVault'))) === good);
  await page.close();
}

// 9b. Storage that cannot be read: fails closed, then opens once it can.
for (const [name, script] of [
  ['browser storage refuses the read', () => { const get = Storage.prototype.getItem; Storage.prototype.getItem = function (key) { if (key === 'proairetosVault' && !window.__unblocked) throw new DOMException('denied', 'SecurityError'); return get.call(this, key); }; }],
  ['the vault database fails to open', () => { const open = IDBFactory.prototype.open; IDBFactory.prototype.open = function (dbName, version) { if (dbName === 'proairetos-vault' && !window.__unblocked) { const request = {}; setTimeout(() => { Object.defineProperty(request, 'error', { value: new DOMException('blocked', 'UnknownError') }); request.onerror && request.onerror(new Event('error')); }, 0); return request; } return open.call(this, dbName, version); }; }],
]) {
  const fresh = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
  await seed(fresh);
  const page = await watched(fresh, 'ergon', script);
  const st = await state(page);
  check(`${name}, with no vault: fails closed, says it cannot check, and the app was never shown`, st.cannotCheck && !st.appEverShown, JSON.stringify(st));
  await page.evaluate(() => { window.__unblocked = true; });
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(1500);
  const after = await state(page);
  check(`${name}: Try again opens the app once the storage can be read`, after.appEverShown && !after.cannotCheck, JSON.stringify(after));
  await page.close();
  await fresh.close();
}

// 9c. Both copies damaged, on a reload.
{
  const page = await context.newPage();
  await page.goto(`${BASE}/ergon/`);
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    localStorage.setItem('proairetosVault', 'garbage');
    const db = await new Promise((res) => { const r = indexedDB.open('proairetos-vault'); r.onsuccess = () => res(r.result); });
    await new Promise((res) => { const tx = db.transaction('header', 'readwrite'); tx.objectStore('header').put('also garbage', 'header'); tx.oncomplete = res; });
    db.close();
  });
  await page.close();
  const again = await watched(context, 'ergon');
  const st = await state(again);
  check('reload with both copies damaged: says so, the app was never shown, nothing removed', st.unreadable && !st.appEverShown && (await again.evaluate(() => localStorage.getItem('proairetosVault'))) === 'garbage', JSON.stringify(st));
  await again.close();
}

// 9d. No vault at all: the app appears after the check, and how long that took.
{
  const fresh = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
  await seed(fresh);
  const page = await watched(fresh, 'ergon');
  const st = await state(page);
  check('reload with no vault anywhere: the app opens, nothing is stored for a vault', st.appEverShown && !st.locked && (await page.evaluate(async () => localStorage.getItem('proairetosVault') === null && !(await indexedDB.databases()).some((db) => db.name === 'proairetos-vault'))), `app first in the page at ${st.at} ms`);
  await page.close();
  await fresh.close();
}

check('no page errors in any app', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const passed = results.filter(Boolean).length;
console.log(`\n${passed} of ${results.length} passed.`);
process.exit(passed === results.length ? 0 : 1);
