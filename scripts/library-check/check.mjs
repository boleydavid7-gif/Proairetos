// Checks the Library page in a real browser, at 390 and 1440 pixels: the page with the provider switch off (the default) and on lists the same
// entries in the same order and looks the same, and with the apps removed the providers' entries are not listed.
//   BASE=http://localhost:4181 OUT=/some/dir CHROMIUM=... node scripts/library-check/check.mjs   (against `vite` or `vite preview`)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || '.visual/library';
mkdirSync(OUT, { recursive: true });
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const results = [];
const check = (name, ok, detail = '') => { results.push(Boolean(ok)); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const stamp = '2026-09-01T10:00:00.000Z';
const COMPANIONS = ['askesis', 'dynamis', 'soma', 'theoria', 'mneme', 'poreia', 'oikonomia'];

async function load({ width, height, on, removed }) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', timezoneId: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
  await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
  await page.goto(`${BASE}/welcome/`);
  await page.evaluate(([on, removed, companions, stamp]) => {
    const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('proairetos.onboarded', 'yes');
    put('proairetosOwned', { apps: ['core'], owner: true, account: true });
    put('proairetos.apps', { added: removed ? [] : companions });
    put('proairetos.appearance', { theme: 'dark', textSize: 'default' });
    if (on) localStorage.setItem('proairetosLibraryProviders', on === 'junk' ? 'junk' : 'on');
    put('dynamis:settings', { started: true });
    put('dynamis:setup', { aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 5], sets: 3, setsSince: '2026-09-01', unit: 'lb', startedOn: '2026-09-01', steps: {}, at: '17:30' });
    put('dynamis:workout:w1', { id: 'w1', date: '2026-10-12', session: 'A', createdAt: '2026-10-12T18:30:00.000Z', minutes: 48, felt: 'good', note: 'Right knee felt fine.', exercises: [{ exercise: 'squat', name: 'Back squat', sets: [{ reps: 5, weight: 135 }, { reps: 5, weight: 145 }] }] });
    put('mneme:note:n1', { id: 'n1', title: 'Chosen note', body: 'A note chosen for Reflect.', pinned: false, inReflect: true, archived: false, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: stamp });
    put('mneme:note:n3', { id: 'n3', title: 'Not chosen', body: 'CANARY-unselected-note', pinned: false, inReflect: false, archived: false, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: stamp });
    put('mneme:idea:i1', { id: 'i1', text: 'An idea chosen for Reflect', stage: 'shape', inReflect: true, createdAt: '2026-10-25T08:00:00.000Z', updatedAt: stamp });
    put('poreia:trip:r1', { id: 'r1', name: 'Lisbon', place: { name: 'Lisbon', label: 'Lisbon, Portugal', country: 'Portugal', countryCode: 'PT' }, start: '2026-09-10', end: '2026-09-16', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
    put('poreia:trip:r2', { id: 'r2', name: 'Porto (upcoming)', place: { name: 'Porto', label: 'Porto, Portugal' }, start: '2026-12-10', end: '2026-12-12', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
    put('poreia:journal:j1', { id: 'j1', tripId: 'r1', date: '2026-09-12', kind: 'memory', title: 'Tram 28', text: 'Rode the tram up the hill.', place: 'Alfama', createdAt: stamp, updatedAt: stamp });
    put('poreia:booking:b1', { id: 'b1', tripId: 'r1', kind: 'flight', title: 'TP 237', confirmation: 'CANARYCODE', address: 'CANARY-street', startDate: '2026-09-10', createdAt: stamp, updatedAt: stamp });
    put('oikonomia:reflect-milestone:m1', { id: 'm1', title: 'Paid off the card', body: 'Wrote this down for myself.', date: '2026-10-30', inReflect: true, createdAt: stamp, updatedAt: stamp });
  }, [on, removed, COMPANIONS, stamp]);
  // The first look makes the device database; then the records that live in it are written.
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2500);
  await page.evaluate(async (stamp) => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('proairetos'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const write = (store, record) => new Promise((resolve, reject) => { const request = db.transaction(store, 'readwrite').objectStore(store).put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    await write('askesisWorkouts', { id: 'a1', date: '2026-10-14', activity: 'run', meters: 5230, seconds: 1750, avgHr: 151, felt: 'easy', notes: 'River loop.', shoeId: 'CANARY-shoe', workoutTitle: 'Easy run', createdAt: '2026-10-14T07:10:00.000Z' });
    await write('somaRecipes', { id: 'rc1', title: 'Lentil soup', notes: 'Less salt next time.', tags: ['soup'], ingredients: ['lentils'], source: 'Grandma', cookedFor: { '2026-10-10': ['Mia', 'Tomas'] }, createdAt: stamp, updatedAt: stamp });
    await write('reflections', { id: 'rf1', userId: 'local', kind: 'FREE', body: 'A reflection from the journal.', createdAt: '2026-10-28T20:00:00.000Z', updatedAt: '2026-10-28T20:00:00.000Z' });
    await write('reflections', { id: 'rf2', userId: 'local', kind: 'FREE', promptKey: 'after-run', body: 'A line after the run.', createdAt: '2026-10-14T08:00:00.000Z', updatedAt: '2026-10-14T08:00:00.000Z' });
    db.close();
  }, stamp);
  await page.goto(`${BASE}/connections`);
  await page.waitForTimeout(Number(process.env.WAIT || 5000));
  const titles = await page.evaluate(() => [...document.querySelectorAll('.connections-record')].map((node) => (node.querySelector('.connections-record__source')?.textContent ?? '') + ' | ' + (node.querySelector('.connections-record__title')?.textContent ?? node.querySelector('h2,h3')?.textContent ?? '')));
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('.connections-record__title[href]')].map((node) => node.getAttribute('href')));
  const text = await page.evaluate(() => document.body.innerText);
  const shot = await page.screenshot();
  await context.close();
  return { titles, hrefs, text, shot, errors };
}

async function diff(a, b) {
  const [x, y] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })]);
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return { same: false, pixels: -1 };
  let pixels = 0;
  let max = 0;
  let box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < x.data.length; i += x.info.channels) {
    if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) {
      pixels += 1;
      max = Math.max(max, Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
      const at = i / x.info.channels;
      const px = at % x.info.width;
      const py = Math.floor(at / x.info.width);
      box = [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)];
    }
  }
  return { same: pixels === 0, pixels, max, box: pixels ? box.join(',') : '' };
}

const SIZES = (process.env.SIZES || '390x844,1440x900').split(',').map((size) => size.split('x').map(Number));
for (const [width, height] of SIZES) {
  const off = await load({ width, height, on: false, removed: false });
  const on = await load({ width, height, on: true, removed: false });
  const again = await load({ width, height, on: false, removed: false });
  const junk = process.env.JUNK ? await load({ width, height, on: 'junk', removed: false }) : undefined;
  const onAgain = process.env.JUNK ? await load({ width, height, on: true, removed: false }) : undefined;
  const gone = await load({ width, height, on: true, removed: true });
  await sharp(off.shot).toFile(`${OUT}/library-${width}-off.png`);
  await sharp(on.shot).toFile(`${OUT}/library-${width}-on.png`);
  await sharp(gone.shot).toFile(`${OUT}/library-${width}-on-apps-removed.png`);
  console.log(`  ${width} titles (off): ${off.titles.join(' ; ')}`);
  check(`${width}: the Library lists entries`, off.titles.length >= 5, `${off.titles.length} entries`);
  check(`${width}: switch on lists the same entries in the same order as switch off`, JSON.stringify(on.titles) === JSON.stringify(off.titles), `${on.titles.length} vs ${off.titles.length}`);
  check(`${width}: the links into the apps are the same`, JSON.stringify(on.hrefs) === JSON.stringify(off.hrefs), `${on.hrefs.length} links`);
  const d = await diff(off.shot, on.shot);
  const noise = await diff(off.shot, again.shot);
  console.log(`  ${width}: off vs on ${d.pixels} pixels, largest channel difference ${d.max ?? 0} of 255 ${d.box ?? ''}; off vs off again ${noise.pixels} pixels ${noise.box ?? ''}`);
  if (junk) {
    const j = await diff(off.shot, junk.shot);
    const o = await diff(on.shot, onAgain.shot);
    console.log(`  ${width}: off vs the key set to something else (still off) ${j.pixels} pixels; on vs on again ${o.pixels} pixels`);
  }
  // Two loads with the switch off are identical, so any difference is the switch's. A difference of two levels of 255 in a few pixels is reported and allowed; more is a failure.
  check(`${width}: the page looks the same (no pixel differs by more than 2 of 255)`, d.same || (d.max <= 2 && d.pixels < 1000), d.same ? 'identical' : `${d.pixels} pixels differ, by at most ${d.max} of 255, in the rail (${d.box}); two loads with it off differ by ${noise.pixels}`);
  check(`${width}: nothing that was not chosen or must not be carried is on the page`, !/CANARY|Porto|TP 237/.test(on.text + off.text));
  check(`${width}: with the apps removed, their entries are not listed and your own are`, gone.titles.length < on.titles.length && gone.titles.some((title) => /Proairetos|Compass/.test(title)) && !gone.titles.some((title) => /Askesis|Dynamis|Soma|Mneme|Poreia|Oikonomia/.test(title)), gone.titles.join(' ; '));
  check(`${width}: no page errors`, off.errors.length + on.errors.length + gone.errors.length === 0, [...off.errors, ...on.errors, ...gone.errors].join(' | '));
  console.log(`  ${width}: off ${off.titles.length} entries, on ${on.titles.length}, apps removed ${gone.titles.length}`);
}
await browser.close();
console.log(results.every(Boolean) ? `\nLibrary check: ${results.length} of ${results.length} passed.` : `\nLibrary check: ${results.filter((ok) => !ok).length} of ${results.length} FAILED.`);
process.exit(results.every(Boolean) ? 0 : 1);
