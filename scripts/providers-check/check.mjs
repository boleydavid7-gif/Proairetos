// Browser check of universal search through providers. Run against `npm run build` + `vite preview` (BASE, default
// http://localhost:4173). It seeds one record in every app (with an unmistakable value in every field search must not
// hold), then checks in a real page what search shows: each app's rows, what is not found, that Oikonomia's due date and
// paid status are on the rendered row, that Hydros is off until switched on, the day in a run's title in several time
// zones, and how often providers run and how long search takes.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const results = [];
const ok = (name, pass, detail = '') => results.push({ pass, line: `${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}` });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

const APPS = ['askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'theoria', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'mneme', 'melete'];
const now = '2026-11-01T09:00:00.000Z';

async function seeded(timezoneId, { clock = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
  // A fixed clock makes dates repeatable, but it also hides the page's performance entries, which the efficiency check reads.
  if (clock) await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
  await page.goto(`${BASE}/welcome/`);
  await page.evaluate(([apps, stamp]) => {
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps }));
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    put('philia:person:p1', { id: 'p1', name: 'Mara', relation: 'Sister', phone: 'canaryphone', notes: [{ id: 'n', text: 'Likes lemon cake' }], gifts: [{ id: 'g', text: 'Linen apron' }], times: [{ id: 't', text: 'Lake weekend' }], createdAt: stamp });
    put('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'zebrafish', repeat: { kind: 'days', every: 3 }, start: '2026-11-02', history: [], createdAt: stamp });
    put('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: 'canarydose', note: 'canarymednote', times: [{ kind: 'clock', at: '08:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], createdAt: stamp });
    put('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'canaryvisit', questions: [{ id: 'q', text: 'canaryquestion' }], at: '2026-11-10T09:00', createdAt: stamp });
    put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', make: 'Bosch', model: 'S100', serial: 'canaryserial', place: 'Kitchen', note: 'Under warranty', createdAt: stamp });
    put('ktema:upkeep:u1', { id: 'u1', name: 'Clean the filter', note: 'Every three months', every: { count: 3, unit: 'months' }, start: '2026-11-10', history: [], createdAt: stamp });
    put('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, notes: 'Spring trip', travelers: 1, stage: 'idea', createdAt: stamp, updatedAt: stamp });
    put('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'stay', title: 'Hotel Alfama', provider: 'Booking', confirmation: 'canarycode', createdAt: stamp, updatedAt: stamp });
    put('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', date: '2026-12-01', title: 'Tram 28', where: 'Alfama', note: 'Go early', createdAt: stamp, updatedAt: stamp });
    put('dynamis:workout:w1', { id: 'w1', date: '2026-10-30', session: 'A', exercises: [], note: 'Felt strong', createdAt: stamp });
    put('phyton:plant:pl1', { id: 'pl1', name: 'Fern', place: 'Hall', note: 'Likes shade', every: 7, log: [], createdAt: stamp });
    put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [], materials: [], createdAt: stamp });
    put('mneme:note:n1', { id: 'n1', title: 'Garden ideas', body: 'Plant beans', updatedAt: stamp, archived: false });
  }, [APPS, now]);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(1200);
  await page.evaluate(async (stamp) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('proairetos'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const put = (store, record) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    await put('somaRecipes', { id: 'r1', title: 'Lentil soup', ingredients: ['1 cup lentils', 'carrot'], notes: 'Add lemon', tags: ['soup'], createdAt: stamp });
    await put('theoriaBooks', { id: 'bk1', title: 'Meditations', author: 'Marcus Aurelius', highlights: [{ id: 'h', text: 'Power over your mind' }], notes: [{ id: 'n', body: 'Re-read book two' }], updatedAt: stamp });
    await put('askesisWorkouts', { id: 'e1', activity: 'run', date: '2026-10-20', notes: 'Felt easy', wentWell: 'Pacing', createdAt: stamp, avgHr: 987 });
    await put('oikonomiaBills', { id: 'bill1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: '2026-12-10', frequency: 'monthly', category: 'Home', autopay: false, reminderDays: 3, notes: 'zebrafish2', payments: [], createdAt: stamp, updatedAt: stamp });
    await put('oikonomiaBills', { id: 'bill2', name: 'Rent', amountCents: 150000, currency: 'USD', dueDate: '2026-11-20', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [{ id: 'p', date: '2026-11-20', amountCents: 150000 }], createdAt: stamp, updatedAt: stamp });
    await put('hydrosDrinks', { id: 'd1', kind: 'tea', label: 'Hibiscus tea', amountOz: 12, caffeineMg: 31337, loggedAt: '2026-11-04T08:43:00.000Z', createdAt: stamp });
    db.close();
  }, now);
  return { context, page, errors };
}

/** Opens search, types, and returns the rendered rows and how long they took to appear. */
async function find(page, text, scope) {
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByRole('searchbox', { name: 'Search' }).waitFor();
  if (scope) await page.getByRole('tab', { name: scope, exact: true }).click();
  const started = Date.now();
  await page.getByRole('searchbox', { name: 'Search' }).fill(text);
  await page.waitForFunction(() => document.querySelectorAll('.search-row').length > 0 || document.querySelector('.empty-note'), null, { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(250);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.search-row')].map((row) => row.innerText.replace(/\s+/g, ' ').trim()));
  return { rows, ms: Date.now() - started };
}
const derived = (page) => page.evaluate(() => performance.getEntriesByType('mark').filter((entry) => entry.name.startsWith('provider-derive:') && !entry.name.startsWith('provider-derive:home:')).map((entry) => ({ app: entry.name.slice(16), ms: entry.detail?.ms ?? 0 })));

// ---------------------------------------------------------------- one time zone, everything
const main = await seeded('America/Los_Angeles');
const { page } = main;
const expectRow = async (query, pattern, name) => {
  const { rows } = await find(page, query);
  ok(name, rows.some((row) => pattern.test(row)), JSON.stringify(rows));
};
const expectNone = async (query, name) => {
  const { rows } = await find(page, query);
  ok(name, rows.length === 0, JSON.stringify(rows));
};

await expectRow('lentil', /Recipe in Soma Lentil soup/, 'Soma recipe');
await expectRow('meditations', /Book in Theoria Meditations/, 'Theoria book');
await expectRow('mara', /Person in Philia Mara/, 'Philia person');
await expectRow('apron', /Person in Philia Mara .*Linen apron/, 'Philia gift idea, shown on the row');
await expectRow('wipe', /Chore in Ergon Wipe counters/, 'Ergon chore');
await expectRow('kitchen', /Chore in Ergon/, 'Ergon room');
await expectRow('sertraline', /Medicine in Therapeia Sertraline/, 'Therapeia medicine');
await expectRow('clinic', /Visit in Therapeia Dr Lee .*Clinic/, 'Therapeia visit place');
await expectRow('dishwasher', /In Ktema Dishwasher/, 'Ktema thing');
await expectRow('bosch', /In Ktema Dishwasher .*Bosch/, 'Ktema make');
await expectRow('filter', /Upkeep in Ktema Clean the filter/, 'Ktema upkeep');
await expectRow('lisbon', /Trip in Poreia Lisbon/, 'Poreia trip');
await expectRow('alfama', /Stay in Lisbon Hotel Alfama/, 'Poreia booking');
await expectRow('tram', /Plan in Lisbon Tram 28/, 'Poreia plan');
await expectRow('pacing', /Run in Askesis Run, Oct 20 .*Pacing/, 'Askesis entry, its day in Los Angeles');
await expectRow('strong', /Session in Dynamis Strength, Oct 30 .*Felt strong/, 'Dynamis session, its day in Los Angeles');

// Oikonomia: name, due date and paid status are what the row shows.
await expectRow('internet', /Bill in Oikonomia Internet/, 'Oikonomia bill by name');
await expectRow('internet paid', /Bill in Oikonomia Internet Not paid/, 'Oikonomia payment status on the rendered row (not paid)');
await expectRow('rent paid', /Bill in Oikonomia Rent Paid/, 'Oikonomia payment status on the rendered row (paid)');
await expectRow('internet december', /Bill in Oikonomia Internet December 10, 2026/, 'Oikonomia due date on the rendered row');
await expectRow('rent november', /Bill in Oikonomia Rent November 20, 2026/, 'Oikonomia due date on the rendered row (paid bill)');

// What is excluded is not found, though it is in the records.
for (const [query, name] of [
  ['zebrafish', 'a chore note'], ['zebrafish2', 'a bill note'], ['98765432', 'a bill amount'], ['canaryserial', 'a Ktema serial number'], ['canarydose', 'a medicine dose'],
  ['canarymednote', 'a medicine note'], ['canaryvisit', 'a visit note'], ['canaryquestion', 'a question for the doctor'], ['canarycode', 'a booking confirmation code'],
  ['canaryphone', 'a phone number'], ['987', 'heart rate'],
]) await expectNone(query, `not found: ${name}`);
// Apps that are not classified are not searched.
for (const [query, name] of [['fern', 'a Phyton plant'], ['biology', 'a Meletē subject'], ['beans', 'a Mneme note']]) await expectNone(query, `not found: ${name} (not classified)`);

// Hydros: off until switched on, then named drinks and day summaries.
await expectNone('hibiscus', 'Hydros is not searched while it is off');
await page.goto(`${BASE}/?open=settings%3Atoday`);
await page.waitForTimeout(1200);
await page.getByRole('switch', { name: 'Hydros in search' }).scrollIntoViewIfNeeded();
await page.getByRole('switch', { name: 'Hydros in search' }).click();
await page.waitForTimeout(400);
await expectRow('hibiscus', /Drink in Hydros Hibiscus tea/, 'Hydros named drink once on');
await expectRow('hibiscus oz', /Day in Hydros .*12 oz/, 'Hydros day summary on the rendered row');
await expectNone('31337', 'not found: caffeine');

// Timing, as the person sees it.
const typed = [];
for (const query of ['lentil', 'internet paid', 'mara', 'zzzz']) typed.push((await find(page, query)).ms);
const slowest = Math.max(...typed);
ok('search shows rows quickly after a fresh page load', slowest < 1500, `${typed.join(', ')} ms from typing to rows (each includes a fixed 250 ms wait; the first search of a page derives every app)`);
ok('no page errors', main.errors.length === 0, JSON.stringify(main.errors));
await main.context.close();

// ---------------------------------------------------------------- how often providers run (no fixed clock: see seeded)
{
  const run = await seeded('America/Los_Angeles', { clock: false });
  const page = run.page;
// Before anything is typed, no provider has run.
await page.goto(`${BASE}/`);
await page.waitForTimeout(900);
await page.getByRole('button', { name: 'Search', exact: true }).first().click();
await page.getByRole('searchbox', { name: 'Search' }).waitFor();
await page.waitForTimeout(500);
ok('no provider runs when search opens with nothing typed', (await derived(page)).length === 0, JSON.stringify(await derived(page)));
// A scope that holds no app records does not run them either.
await page.getByRole('tab', { name: 'Items', exact: true }).click();
await page.getByRole('searchbox', { name: 'Search' }).fill('zzzz');
await page.waitForTimeout(500);
ok('no provider runs while typing in a scope that holds none of their rows', (await derived(page)).length === 0, JSON.stringify(await derived(page)));

// Efficiency, in one page that stays open (a reload would start the count again): the first search derives each app
// that is on, a second search reuses all of it, and a change made in another tab rebuilds only the app it belongs to.
async function typeHere(text) {
  if (!(await page.getByRole('searchbox', { name: 'Search' }).count())) await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByRole('searchbox', { name: 'Search' }).waitFor();
  await page.getByRole('searchbox', { name: 'Search' }).fill(text);
  await page.waitForFunction(() => document.querySelectorAll('.search-row').length > 0 || document.querySelector('.empty-note'), null, { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.search-row')].map((row) => row.innerText.replace(/\s+/g, ' ').trim()));
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  await page.waitForTimeout(300);
  return rows;
}
await page.goto(`${BASE}/`);
await page.waitForTimeout(1000);
const first = await typeHere('lentil');
const afterFirst = await derived(page);
const ON = ['askesis', 'dynamis', 'ergon', 'ktema', 'oikonomia', 'philia', 'poreia', 'soma', 'theoria', 'therapeia'];
ok('the first search derives each app that is on, and no other', JSON.stringify(afterFirst.map((entry) => entry.app).sort()) === JSON.stringify(ON), JSON.stringify(afterFirst.map((entry) => entry.app).sort()));
ok('the first search still finds the recipe', first.some((row) => /Lentil soup/.test(row)), JSON.stringify(first));
await typeHere('mara');
await typeHere('internet');
ok('later searches reuse what was derived', (await derived(page)).length === afterFirst.length, `${afterFirst.length} derivations, then ${(await derived(page)).length}`);
const other = await run.context.newPage();
await other.goto(`${BASE}/welcome/`);
await other.evaluate(() => localStorage.setItem('philia:person:p2', JSON.stringify({ id: 'p2', name: 'Tomas', notes: [], gifts: [], times: [], createdAt: '2026-11-02T09:00:00.000Z' })));
await page.waitForTimeout(500);
const tomas = await typeHere('tomas');
const afterChange = await derived(page);
const newOnes = afterChange.slice(afterFirst.length).map((entry) => entry.app);
ok('a change in Philia made in another tab rebuilds only Philia', newOnes.length === 1 && newOnes[0] === 'philia' && tomas.some((row) => /Tomas/.test(row)), JSON.stringify({ newOnes, tomas }));
await other.close();

  ok('no page errors while measuring', run.errors.length === 0, JSON.stringify(run.errors));
  console.log('derivation time per app (ms):', JSON.stringify(Object.fromEntries(afterChange.map((entry) => [entry.app, entry.ms]))));
  await run.context.close();
}

// ---------------------------------------------------------------- the same day in other time zones
for (const zone of ['Pacific/Auckland', 'Pacific/Pago_Pago', 'Asia/Kolkata', 'UTC']) {
  const run = await seeded(zone);
  const run1 = await find(run.page, 'pacing');
  const run2 = await find(run.page, 'strong');
  ok(`Askesis and Dynamis name the same day in ${zone}`, run1.rows.some((row) => /Run, Oct 20/.test(row)) && run2.rows.some((row) => /Strength, Oct 30/.test(row)), JSON.stringify([run1.rows, run2.rows]));
  await run.context.close();
}

await browser.close();
console.log(results.map((entry) => entry.line).join('\n'));
const failed = results.filter((entry) => !entry.pass).length;
console.log(`${results.length - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
