// Checks notices in a real browser: with the providers asked (the default) and with the device told to go back to the apps' own
// functions, the notices kept for the service worker are the same, and no value a notice must not carry is in them, with the lock
// screen showing details or keeping them private.
//   BASE=http://localhost:4180 CHROMIUM=... node scripts/notices-check/check.mjs   (against `vite` or `vite preview`)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

process.env.BASE ||= 'http://localhost:4173';
const BASE = process.env.BASE;
const { seed } = await import('../calendar-check/check.mjs');
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const results = [];
const check = (name, ok, detail = '') => { results.push(Boolean(ok)); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

async function kept({ rollback, details }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
  await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
  await seed(page);
  await page.evaluate(([rollback, details]) => {
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const stamp = '2026-11-01T00:00:00.000Z';
    // A flight and a stay with the values a reminder must not carry, a visit and a medicine with names chosen, a bill with an amount.
    put('poreia:booking:bx', { id: 'bx', tripId: 'tr1', kind: 'flight', title: 'TP 999', confirmation: 'CANARYCODE', startDate: '2026-11-06', startTime: '10:00', from: 'CANARY-JFK', address: 'CANARY-street', createdAt: stamp, updatedAt: stamp });
    put('therapeia:medicine:mx', { id: 'mx', name: 'Vitamin D', dose: 'CANARY-dose', note: 'CANARY-note', times: [{ kind: 'clock', at: '15:00' }], days: { kind: 'daily' }, start: '2026-11-01', taken: [], createdAt: stamp });
    put('therapeia:visit:vx', { id: 'vx', with: 'Dr CANARY', at: '2026-11-06T09:00', where: 'CANARY-where', questions: [] });
    put('therapeia:settings', { started: true, notices: { doses: true, names: true, refills: true, appointments: true, appointmentLead: 120 } });
    put('proairetos.notify', { details });
    if (rollback) localStorage.setItem('proairetosNoticeProviders', 'off');
  }, [rollback, details]);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(6000);
  const list = await page.evaluate(async () => {
    const cache = await caches.open('proairetos-notify');
    const response = await cache.match('/__notify/upcoming.json');
    return response ? await response.json() : null;
  });
  await context.close();
  return { list, errors };
}

const way = await kept({ rollback: false, details: true });
const back = await kept({ rollback: true, details: true });
const quiet = await kept({ rollback: false, details: false });

const text = JSON.stringify(way.list);
check('the page kept notices for the worker', Array.isArray(way.list) && way.list.length > 0, `${way.list?.length} notices`);
check('through the providers or through the apps’ own functions, the notices are the same', JSON.stringify(way.list) === JSON.stringify(back.list), `${way.list?.length} vs ${back.list?.length}`);
check('no page errors', way.errors.length + back.errors.length + quiet.errors.length === 0, [...way.errors, ...back.errors, ...quiet.errors].join(' | '));
for (const [name, list] of [['details on', way.list], ['details private', quiet.list]]) {
  // The words a notice says: title, body and where it opens. A notice's key is its tag; it is kept as it was (docs/PHASE3_SLICE5_PLAN.md,
  // "Notice keys") and checked on its own below.
  const all = JSON.stringify(list.map(({ title, body, open }) => ({ title, body, open })));
  const stray = (all.match(/CANARY[\w-]*|Confirmation|\$\s?\d+/g) ?? []).filter((word) => !(name === 'details on' && (word === 'CANARY-where' || word === 'CANARY')));
  check(`${name}: no code, address, departure place, dose, note or amount${name === 'details on' ? ' (the visit\u2019s place is shown, names being chosen)' : ''}`, stray.length === 0, stray.join(','));
}
const wordsOnly = (list) => !list.some((notice) => /CANARY-dose/.test(notice.title + notice.body + notice.open + notice.key));
check('the dose amount is in no dose notice\u2019s key or words, details on or private (an earlier key on the device may hold it)', wordsOnly(way.list) && wordsOnly(quiet.list));
check('details on: the flight, the medicine’s name (names chosen) and the visit’s clinician (names chosen) are said', /TP 999/.test(text) && /Vitamin D/.test(text) && /Leaves 10:00/.test(text), '');
check('details on: the visit, names being chosen, says who it is with and where', /Dr CANARY/.test(text) && /CANARY-where/.test(text));
check('details private: only the app’s name and the time are kept', quiet.list.length > 0 && quiet.list.every((notice) => /Reminder · /.test(notice.body) && !/TP 999|Vitamin D|Biology|Mara/.test(notice.title + notice.body)), `${quiet.list?.length} notices`);
check('details private and details on keep the same notices at the same times', JSON.stringify(quiet.list.map((n) => [n.key, n.at])) === JSON.stringify(way.list.map((n) => [n.key, n.at])));


// ---- Key migration K1: across a reload, keys made of ids, the earlier key kept on the device, what was cleared still cleared.
async function across() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
  await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
  await seed(page);
  const doseAt = Date.UTC(2026, 10, 4, 15); // yesterday's 15:00 dose, which has come due
  const before = {
    dose: `therapeia:dose:${doseAt}:Vitamin D, CANARY-dose`,
    chore: 'ergon:2026-11-04:09:00:CANARYchore|Wipe counters', // the seed's own chore is due that morning too
    upkeep: 'ktema:2026-11-04:CANARYupkeep',
    plant: 'phyton:2026-11-04:CANARYplant|/',
  };
  const after = {
    dose: `therapeia:dose:${doseAt}:mx`,
    chore: 'ergon:2026-11-04:09:00:c1|cx',
    upkeep: 'ktema:2026-11-04:ux',
    plant: 'phyton:2026-11-04:px|/',
  };
  await page.evaluate(([before]) => {
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const stamp = '2026-11-01T00:00:00.000Z';
    put('therapeia:medicine:mx', { id: 'mx', name: 'Vitamin D', dose: 'CANARY-dose', times: [{ kind: 'clock', at: '15:00' }], days: { kind: 'daily' }, start: '2026-11-01', taken: [], createdAt: stamp });
    put('therapeia:settings', { started: true, notices: { doses: true, names: true, refills: true, appointments: true, appointmentLead: 120 } });
    put('ergon:chore:cx', { id: 'cx', name: 'CANARYchore', repeat: { kind: 'days', every: 1 }, history: [{ date: '2026-11-03' }], start: '2026-11-01', createdAt: stamp });
    put('ktema:upkeep:ux', { id: 'ux', name: 'CANARYupkeep', every: { count: 1, unit: 'months' }, start: '2026-11-04', history: [], createdAt: stamp });
    put('phyton:plant:px', { id: 'px', name: 'CANARYplant', every: 7, start: '2026-11-04', log: [], createdAt: stamp });
    put('proairetos.notify', { details: true });
    // Ergon is not in the seed's apps.
    const apps = JSON.parse(localStorage.getItem('proairetos.apps') ?? '{"added":[]}');
    if (!apps.added.includes('ergon')) put('proairetos.apps', { ...apps, added: [...apps.added, 'ergon'] });
    put('ergon:settings', { started: true });
    // As it was before the update: these were cleared and seen under the old keys.
    put('proairetosInboxCleared', Object.values(before));
    put('proairetosInboxSeen', Object.values(before));
  }, [before]);
  const read = async () => ({
    cache: await page.evaluate(async () => {
      const response = await (await caches.open('proairetos-notify')).match('/__notify/upcoming.json');
      return response ? await response.json() : [];
    }),
    cleared: await page.evaluate(() => JSON.parse(localStorage.getItem('proairetosInboxCleared') ?? '[]')),
  });
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(6000);
  const first = await read();
  await page.reload();
  await page.waitForTimeout(6000);
  const second = await read();
  await context.close();
  return { first, second, errors, before, after };
}
const k1 = await across();
const moved = (list) => list.filter((notice) => /^(therapeia:dose:|ktema:\d|ergon:\d|phyton:\d)/.test(notice.key) && !/warranty|frost/.test(notice.key));
const keys = moved(k1.first.cache);
check('K1: day notices from the four apps are in the cache, with keys made of ids', keys.length > 0 && keys.every((notice) => !/CANARY|Vitamin|Take out|pothos|Dishwasher/.test(notice.key)), keys.slice(0, 3).map((notice) => notice.key).join(' ; '));
check('K1: each carries the key it had, on the device', keys.every((notice) => Array.isArray(notice.also) && notice.also.length === 1 && notice.also[0] !== notice.key), '');
check('K1: the keys and their earlier keys are the same after a reload', JSON.stringify(moved(k1.second.cache).map((n) => [n.key, n.also, n.at])) === JSON.stringify(keys.map((n) => [n.key, n.also, n.at])));
for (const name of ['dose', 'chore', 'upkeep', 'plant']) {
  check(`K1: ${name} cleared under the old key is cleared under the new one too, after the update and after a reload`, k1.first.cleared.includes(k1.after[name]) && k1.second.cleared.includes(k1.after[name]) && k1.second.cleared.includes(k1.before[name]), `${k1.after[name]}`);
}
check('K1: no page errors', k1.errors.length === 0, k1.errors.join(' | '));

await browser.close();
console.log(results.every(Boolean) ? `\nNotices check: ${results.length} of ${results.length} passed.` : `\nNotices check: ${results.filter((ok) => !ok).length} of ${results.length} FAILED.`);
process.exit(results.every(Boolean) ? 0 : 1);
