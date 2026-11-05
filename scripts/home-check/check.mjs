// Photographs Today's two app groups (Daily practices, Worth your attention) with one record in every app that
// contributes, on a fixed clock, and writes what they say and show: `home.json` (text and markup) and element pictures.
// Used to hold the Home migration to what Home showed before it. Run against `npm run build` + `vite preview`:
//   OUT=.visual/home-before TZ=UTC CHROMIUM=... node scripts/home-check/check.mjs
//   node scripts/home-check/compare.mjs .visual/home-before .visual/home-after
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || '.visual/home';
const ZONE = process.env.TZ_ID || process.env.TZ || 'UTC';
mkdirSync(OUT, { recursive: true });

const APPS = ['askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'melete'];
const stamp = '2026-11-01T09:00:00.000Z';

/** The seed: one record in every app that puts something on Home, dated against the fixed clock (Thu 5 Nov 2026, noon). */
export async function seed(page) {
  await page.goto(`${BASE}/welcome/`);
  await page.evaluate(([apps, stamp]) => {
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps }));
    localStorage.setItem('hydros:settings-format', '3');
    put('hydros:settings', { goalChosen: true, goalOz: 64, unit: 'oz' });
    put('diaita:settings', { started: true });
    put('diaita:sleep:2026-11-05', { date: '2026-11-05', bed: '23:00', up: '06:30' });
    put('dynamis:setup', { aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 5], sets: 3, setsSince: '2026-10-01', unit: 'kg', startedOn: '2026-10-01', steps: {} });
    put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ id: 'd1', title: 'Midterm', date: '2026-11-08', kind: 'exam' }], materials: [], createdAt: stamp });
    put('melete:session:ss1', { id: 'ss1', subjectId: 's1', kind: 'read', start: '2026-11-05T15:00:00', minutes: 30 });
    put('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'canary-note', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: stamp });
    put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'canary-serial', createdAt: stamp });
    put('ktema:upkeep:u1', { id: 'u1', thingId: 't1', name: 'Clean the filter', note: 'canary-upkeep', every: { count: 3, unit: 'months' }, start: '2026-11-01', history: [], createdAt: stamp });
    put('phyton:plant:pl1', { id: 'pl1', name: 'Fern', place: 'Hall', note: 'canary-plant', every: 7, start: '2026-10-25', log: [], createdAt: stamp });
    put('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: '50 mg', note: 'canary-med', times: [{ kind: 'clock', at: '20:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], supply: { count: 3, countedAt: '2026-11-01T08:00:00', perDose: 1, lead: 7 }, createdAt: stamp });
    put('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'canary-visit', questions: [], at: '2026-11-05T15:00', createdAt: stamp });
    put('philia:person:p1', { id: 'p1', name: 'Mara', birthday: '11-08', notes: [], gifts: [], times: [], createdAt: stamp });
    put('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
    put('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', createdAt: stamp, updatedAt: stamp });
    put('poreia:pack:pk1', { id: 'pk1', tripId: 'tr1', name: 'Charger', packed: false, createdAt: stamp });
    put('askesis:settings', { unit: 'km' });
  }, [APPS, stamp]);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(1500);
  await page.evaluate(async (stamp) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('proairetos'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const put = (store, record) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    await put('somaRecipes', { id: 'r1', title: 'Lentil soup', ingredients: [], notes: '', tags: [], planned: ['2026-11-05'], createdAt: stamp, updatedAt: stamp });
    await put('oikonomiaBills', { id: 'bill1', name: 'Internet', amountCents: 5000, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: stamp, updatedAt: stamp });
    await put('hydrosDrinks', { id: 'd1', kind: 'water', amountOz: 16, loggedAt: '2026-11-05T09:00:00', createdAt: stamp });
    await put('askesisWorkouts', { id: 'e1', date: '2026-11-05', activity: 'run', seconds: 1800, meters: 5000, createdAt: stamp });
    db.close();
  }, stamp);
}

const normalize = (html) => html.replace(/\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, '').replace(/data-ll-[a-z-]+="[^"]*"/g, '').replace(/\s+/g, ' ').trim();

export async function capture(page, label) {
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2500);
  const sections = {};
  for (const [name, selector] of [['daily', '.today-app-overview--daily'], ['attention', '.today-app-overview--attention']]) {
    const element = page.locator(selector);
    if (!(await element.count())) { sections[name] = null; continue; }
    sections[name] = { text: await element.innerText(), html: normalize(await element.evaluate((node) => node.outerHTML)) };
    await element.screenshot({ path: join(OUT, `${label}-${name}.png`) });
  }
  return sections;
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
    result.runs[label] = { sections: await capture(page, label), errors };
    await context.close();
  }
  await browser.close();
  writeFileSync(join(OUT, 'home.json'), JSON.stringify(result, null, 2));
  const dark = result.runs['dark-390'];
  console.log('dark phone, daily:\n' + (dark.sections.daily?.text ?? '(none)'));
  console.log('\ndark phone, attention:\n' + (dark.sections.attention?.text ?? '(none)'));
  console.log('\nerrors:', JSON.stringify(Object.fromEntries(Object.entries(result.runs).map(([key, value]) => [key, value.errors]))));
}
