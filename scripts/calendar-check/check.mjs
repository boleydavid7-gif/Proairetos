// Photographs what the calendar says: Days ahead as a list, and as a week, month and year, and Today's timeline, with
// one record of every kind in each contributing app (Philia, Oikonomia, Ktema, Meletē, Therapeia, Poreia), on a fixed
// clock. Writes `calendar.json` (text and markup per view) and element pictures. Holds the Calendar migration to what the
// calendar showed before it. Run against `npm run build` + `vite preview`:
//   OUT=.visual/cal-before TZ_ID=UTC CHROMIUM=... node scripts/calendar-check/check.mjs
//   node scripts/calendar-check/compare.mjs scripts/calendar-check/baseline/utc.json .visual/cal-after
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seed as seedHome } from '../home-check/check.mjs';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || '.visual/cal';
const ZONE = process.env.TZ_ID || process.env.TZ || 'UTC';
mkdirSync(OUT, { recursive: true });
const stamp = '2026-11-01T09:00:00.000Z';

/** The home seed, plus what only the calendar shows: a dinner at a time, an anniversary, a warranty end, a paid bill, a booking at a time, a visit for someone else. */
async function seed(page) {
  await seedHome(page);
  await page.evaluate(([stamp]) => {
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    put('philia:person:p2', { id: 'p2', name: 'Tomas', birthday: '03-14', dates: [{ id: 'd1', label: 'Dinner', date: '2026-11-06', once: true, time: '19:00' }, { id: 'd2', label: 'Anniversary', date: '2015-11-09' }], notes: [], gifts: [], times: [], createdAt: stamp });
    put('ktema:thing:t2', { id: 't2', name: 'Passport', category: 'Documents', warrantyUntil: '2026-11-10', createdAt: stamp });
    put('therapeia:visit:v2', { id: 'v2', with: 'Dr Okafor', who: 'Mia', where: 'Eastside', notes: 'canary-visit', questions: [], at: '2026-11-06T10:30', createdAt: stamp });
    put('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', confirmation: 'CANARY-CODE', createdAt: stamp, updatedAt: stamp });
    put('poreia:booking:b2', { id: 'b2', tripId: 'tr1', kind: 'stay', title: 'Hotel Alfama', startDate: '2026-11-07', endDate: '2026-11-12', createdAt: stamp, updatedAt: stamp });
    put('melete:subject:s2', { id: 's2', name: 'Statistics', dates: [{ id: 'd3', title: 'Problem set', date: '2026-11-12', kind: 'due' }], materials: [], createdAt: stamp });
  }, [stamp]);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(1500);
  await page.evaluate(async (stamp) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('proairetos'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const put = (store, record) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    await put('oikonomiaBills', { id: 'bill2', name: 'Rent', amountCents: 123456, currency: 'USD', dueDate: '2026-11-08', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [{ id: 'pay1', date: '2026-11-08', amountCents: 123456 }], createdAt: stamp, updatedAt: stamp });
    db.close();
  }, stamp);
}

const normalize = (html) => html.replace(/\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, '').replace(/data-ll-[a-z-]+="[^"]*"/g, '').replace(/_r_[0-9a-z]+_/g, '_r_').replace(/\s+/g, ' ').trim();

async function take(page, label, name, selector) {
  const element = page.locator(selector).first();
  if (!(await element.count())) return null;
  await element.screenshot({ path: join(OUT, `${label}-${name}.png`) });
  return { text: await element.innerText(), html: normalize(await element.evaluate((node) => node.outerHTML)) };
}

export async function capture(page, label) {
  const views = {};
  await page.goto(`${BASE}/today`);
  await page.waitForTimeout(2500);
  views.today = await take(page, label, 'today', '.timeline, [class*="timeline"]');
  await page.goto(`${BASE}/plan`);
  await page.waitForTimeout(2000);
  views.list = await take(page, label, 'list', '.days-list-column');
  await page.goto(`${BASE}/calendar`);
  await page.waitForTimeout(2000);
  for (const mode of ['Week', 'Month', 'Year']) {
    await page.getByRole('tab', { name: mode, exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(900);
    views[mode.toLowerCase()] = await take(page, label, mode.toLowerCase(), 'main');
  }
  return views;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const result = { zone: ZONE, clock: '2026-11-05T12:00:00', runs: {} };
  for (const [scheme, width, height] of [['dark', 390, 844], ['light', 390, 844], ['dark', 1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', timezoneId: ZONE, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
    await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
    await seed(page);
    if (scheme === 'light') await page.evaluate(() => localStorage.setItem('proairetos.appearance', JSON.stringify({ theme: 'light', textSize: 'default' })));
    const label = `${scheme}-${width}`;
    result.runs[label] = { views: await capture(page, label), errors };
    await context.close();
  }
  await browser.close();
  writeFileSync(join(OUT, 'calendar.json'), JSON.stringify(result, null, 2));
  const dark = result.runs['dark-390'].views;
  for (const name of ['today', 'list', 'month']) console.log(`\n== ${name} (dark phone)\n${dark[name]?.text ?? '(none)'}`);
  console.log('\nerrors:', JSON.stringify(Object.fromEntries(Object.entries(result.runs).map(([key, value]) => [key, value.errors]))));
}
