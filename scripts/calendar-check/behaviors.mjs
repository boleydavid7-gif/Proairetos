// The calendar's interactions in a real browser, on records dated from today (no fake clock, so the performance marks
// show): which apps derive on first load, an edit and a deletion made in another tab, an app removed, a span that ends
// the day after its last day, a bill shown with no amount, and how long the first load and the derivations take.
//   CHROMIUM=... node scripts/calendar-check/behaviors.mjs   (against `npm run build` + `vite preview`)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const stamp = new Date().toISOString();
const APPS = ['philia', 'therapeia', 'ktema', 'oikonomia', 'melete', 'poreia'];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));

const dates = { visit: ymd(inDays(1)), bday: inDays(3), warranty: ymd(inDays(2)), exam: ymd(inDays(4)), tripStart: ymd(inDays(2)), tripEnd: ymd(inDays(5)), bill: ymd(inDays(2)), paid: ymd(inDays(3)) };
await page.goto(`${BASE}/welcome/`);
await page.evaluate(([apps, d, stamp]) => {
  const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  localStorage.setItem('proairetos.onboarded', 'yes');
  localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
  localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps }));
  put('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'canary-visit', questions: [], at: `${d.visit}T10:00`, createdAt: stamp });
  put('philia:person:p1', { id: 'p1', name: 'Mara', birthday: `1984-${String(d.bday.m).padStart(2, '0')}-${String(d.bday.d).padStart(2, '0')}`, notes: [], gifts: [], times: [], createdAt: stamp });
  put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'canary-serial', warrantyUntil: d.warranty, createdAt: stamp });
  put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ id: 'd1', title: 'Midterm', date: d.exam, kind: 'exam' }], materials: [], createdAt: stamp });
  put('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: d.tripStart, end: d.tripEnd, travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
}, [APPS, { ...dates, bday: { m: dates.bday.getMonth() + 1, d: dates.bday.getDate() } }, stamp]);
await page.goto(`${BASE}/`);
await page.waitForTimeout(1500);
await page.evaluate(async ([d, stamp]) => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('proairetos'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const put = (store, record) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  await put('oikonomiaBills', { id: 'bill1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: d.bill, frequency: 'once', autopay: false, reminderDays: 3, notes: 'canary-note', payments: [], createdAt: stamp, updatedAt: stamp });
  await put('oikonomiaBills', { id: 'bill2', name: 'Rent', amountCents: 123456, currency: 'USD', dueDate: d.paid, frequency: 'once', autopay: false, reminderDays: 3, payments: [{ id: 'p', date: d.paid, amountCents: 123456 }], createdAt: stamp, updatedAt: stamp });
  db.close();
}, [dates, stamp]);

const marks = () => page.evaluate(() => performance.getEntriesByType('mark').filter((m) => m.name.startsWith('provider-derive:calendar:')).map((m) => ({ app: m.name.slice(25), ms: m.detail?.ms ?? 0 })));
const text = () => page.locator('.days-list-column').innerText().catch(() => '');

await page.goto(`${BASE}/plan`);
await page.waitForTimeout(2500);
const first = await marks();
const derived = first.map((m) => m.app).sort();
check('each contributing app derives once on first load', JSON.stringify(derived) === JSON.stringify([...APPS].sort()), derived.join(','));
const load = await page.evaluate(() => Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd));
check('the page loads within the budget', load < 3000, `${load} ms to DOMContentLoaded`);
check('the derivations are quick', first.every((m) => m.ms < 200), `${first.map((m) => `${m.app} ${m.ms} ms`).join(', ')}`);

let t = await text();
check('a visit, a birthday, a warranty end, an exam and a trip are on the list', /Dr Lee/.test(t) && /Mara’s birthday/.test(t) && /Dishwasher: warranty ends/.test(t) && /Biology: Midterm/.test(t) && /All day · Lisbon/.test(t));
check('the bills show their names and paid state and no amount', /Internet/.test(t) && /Rent/.test(t) && /\bpaid\b/.test(t) && !/\$|98,765|1,234|USD/.test(t));
check('excluded fields are nowhere on the page', !/canary/i.test(await page.locator('body').innerText()));
const spanDays = (t.match(/All day · Lisbon/g) ?? []).length;
check('a trip fills its days and ends the day after its last day', spanDays === 4, `${spanDays} days shown for ${dates.tripStart} to ${dates.tripEnd}`);

// Another tab edits a visit and deletes a person: this tab follows without a reload, and only those apps derive again.
const other = await context.newPage();
await other.goto(`${BASE}/welcome/`);
const before = (await marks()).length;
await other.evaluate(([date, stamp]) => localStorage.setItem('therapeia:visit:v1', JSON.stringify({ id: 'v1', with: 'Dr Patel', where: 'Clinic', notes: 'canary-visit', questions: [], at: `${date}T10:00`, createdAt: stamp })), [dates.visit, stamp]);
await page.waitForTimeout(1500);
t = await text();
check('a visit edited in another tab changes here', /Dr Patel/.test(t) && !/Dr Lee/.test(t));
const afterEdit = (await marks()).slice(before).map((m) => m.app);
check('only Therapeia derived again', afterEdit.length >= 1 && afterEdit.every((a) => a === 'therapeia'), afterEdit.join(','));
await other.evaluate(() => localStorage.removeItem('philia:person:p1'));
await page.waitForTimeout(1500);
check('a person deleted in another tab leaves the list', !/Mara’s birthday/.test(await text()));

// An app removed from the Store's added list: its lines go and it is not asked.
await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('proairetos.apps')); a.added = a.added.filter((x) => x !== 'ktema'); localStorage.setItem('proairetos.apps', JSON.stringify(a)); });
await page.reload();
await page.waitForTimeout(2500);
const reloaded = await marks();
check('a removed app’s lines are gone and it does not derive', !/Dishwasher/.test(await text()) && !reloaded.some((m) => m.app === 'ktema'));
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
