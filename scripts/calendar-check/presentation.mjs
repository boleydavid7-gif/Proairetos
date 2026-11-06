// Checks the calendar's presentation in a real browser: which entries are links and where they open, that an entry an app
// owns has no Delete, and that an imported calendar's events keep Delete with undo. Same seed as check.mjs, plus an imported
// calendar with a timed and an all-day event.
//   CHROMIUM=... node scripts/calendar-check/presentation.mjs   (against `npm run build` + `vite preview`)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { seed } from './check.mjs';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC', reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
await seed(page);
await page.evaluate(() => {
  localStorage.setItem('proairetos.otherCalendars', JSON.stringify([{ id: 'imp1', name: 'Work calendar', shown: true }]));
  localStorage.setItem('proairetos.otherCalendars.imp1', JSON.stringify([
    { key: 'imp1:e1', title: 'Dentist', start: '2026-11-06T14:00:00.000Z', end: '2026-11-06T15:00:00.000Z' },
    { key: 'imp1:e2', title: 'Conference', start: '2026-11-09T00:00:00.000Z', end: '2026-11-10T00:00:00.000Z', allDay: { from: '2026-11-09', until: '2026-11-10' } },
  ]));
});

// ---- the list (phone)
await page.goto(`${BASE}/plan`);
await page.waitForTimeout(2200);
const list = page.locator('.days-list-column');
const rows = await list.locator('.days-row').evaluateAll((nodes) => nodes.map((n) => ({ text: n.querySelector('.days-row__title')?.textContent ?? '', href: n.querySelector('a.days-row__button')?.getAttribute('href') ?? null, chevron: Boolean(n.querySelector('.days-row__chevron')), remove: Boolean(n.querySelector('.days-row__remove')) })));
const spans = await list.locator('.days-allday').evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.trim(), href: n.querySelector('a')?.getAttribute('href') ?? null, remove: Boolean(n.querySelector('button')) })));
const want = { 'Dr Lee': '/therapeia/?open=visit%3Av1', 'Mia: Dr Okafor': '/therapeia/?open=visit%3Av2', 'Biology · Study': '/melete/?open=session:ss1', 'Dinner · Tomas': '/philia/?open=person%3Ap2', 'Flight: TP 123': '/poreia/?open=booked%3Ab1', 'Tram 28': '/poreia/?open=plan%3Apn1' };
for (const [title, href] of Object.entries(want)) {
  const row = rows.find((r) => r.text === title);
  check(`list: ${title} opens ${href}`, row && row.href === href && row.chevron && !row.remove, row ? `${row.href}, chevron ${row.chevron}, delete ${row.remove}` : 'row not found');
}
const lisbon = spans.filter((s) => /Lisbon/.test(s.text));
check('list: the trip spans link to the trip and have no Delete', lisbon.length === 5 && lisbon.every((s) => s.href === '/poreia/?open=trip%3Atr1' && !s.remove), `${lisbon.length} spans`);
const dentist = rows.find((r) => r.text === 'Dentist');
check('list: an imported event is not a link and keeps its Delete', dentist && dentist.href === null && dentist.remove);
const conference = spans.find((s) => /Conference/.test(s.text));
check('list: an imported all-day event keeps its Delete', conference && conference.href === null && conference.remove);
const quiet = await list.locator('a.days-bills').evaluateAll((nodes) => nodes.map((n) => ({ text: n.innerText.replace(/\s+/g, ' ').trim(), href: n.getAttribute('href'), glyph: n.querySelector('svg')?.innerHTML.includes('r="8"') ? 'target' : n.querySelector('svg')?.innerHTML.includes('M17 4.5') ? 'repeat' : 'list' })));
const q = (t) => quiet.find((x) => x.text.startsWith(t));
check('quiet: a bill is a deadline with a target and Due', q('Internet')?.glyph === 'target' && q('Internet')?.text === 'Internet · Due' && q('Internet')?.href === '/oikonomia/?open=bill:bill1', JSON.stringify(q('Internet')));
check('quiet: a paid bill says Paid and no Due', q('Rent')?.text === 'Rent Paid', JSON.stringify(q('Rent')));
check('quiet: a birthday and an anniversary are recurring with Every year', q('Mara')?.glyph === 'repeat' && q('Mara')?.text === 'Mara’s birthday · Every year' && q('Tomas: Anniversary')?.text === 'Tomas: Anniversary · Every year', JSON.stringify([q('Mara'), q('Tomas: Anniversary')]));
check('quiet: warranty and exam dates', q('Passport')?.text === 'Passport: ends' && q('Biology: Midterm')?.text === 'Biology: Midterm · Due' && q('Passport')?.href === '/ktema/?open=thing%3At2' && q('Biology: Midterm')?.href === '/melete/?open=subject:s1', JSON.stringify([q('Passport'), q('Biology: Midterm')]));

// ---- Delete and undo on an imported event
await list.locator('.days-row', { hasText: 'Dentist' }).locator('.days-row__remove').click();
await page.waitForTimeout(500);
check('imported: Delete removes it and offers undo', (await list.getByText('Dentist').count()) === 0 && (await page.getByRole('button', { name: /undo/i }).count()) > 0);
await page.getByRole('button', { name: /undo/i }).first().click();
await page.waitForTimeout(500);
check('imported: Undo brings it back', (await list.getByText('Dentist').count()) > 0);

// ---- keyboard: a row opens with Enter and shows a focus state
const link = list.locator('a.days-row__button', { hasText: 'Dr Lee' });
await link.focus();
const focused = await link.evaluate((n) => document.activeElement === n);
check('keyboard: an app-owned row takes focus', focused);

// ---- the week (desktop), the month day panel and Today
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/calendar`);
await page.waitForTimeout(2000);
const week = await page.locator('.cal-entry').evaluateAll((nodes) => nodes.map((n) => ({ title: n.querySelector('.cal-entry__title')?.textContent ?? '', href: n.querySelector('a.cal-entry__open')?.getAttribute('href') ?? null, remove: Boolean(n.querySelector('.cal-entry__remove')) })));
const w = (t) => week.find((e) => e.title === t);
check('week: app entries are links with no hover Delete', ['Dr Lee', 'Mia: Dr Okafor', 'Flight: TP 123', 'Tram 28', 'Dinner · Tomas'].every((t) => w(t) && w(t).href && !w(t).remove), JSON.stringify(week.map((e) => [e.title, !!e.href, e.remove])));
check('week: an imported event keeps its hover Delete', w('Dentist') && !w('Dentist').href && w('Dentist').remove);
await page.getByRole('tab', { name: 'Month', exact: true }).first().click();
await page.waitForTimeout(900);
await page.locator('.month__day', { hasText: '7' }).filter({ has: page.locator('.month__num', { hasText: /^7$/ }) }).first().click();
await page.waitForTimeout(600);
const panel = await page.locator('.month-day .days-row, .month-day .days-allday').evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), href: n.querySelector('a')?.getAttribute('href') ?? null, remove: Boolean(n.querySelector('button')) })));
check('month day panel: Nov 7 entries are links with no Delete', panel.length >= 3 && panel.every((r) => r.href && !r.remove), JSON.stringify(panel));
await page.goto(`${BASE}/today`);
await page.waitForTimeout(2500);
const today = await page.locator('.timeline a.timeline__entry--link').evaluateAll((nodes) => nodes.map((n) => [n.querySelector('.timeline__title')?.textContent, n.getAttribute('href')]));
check('today: Dr Lee and the study session open their records', today.some(([t, h]) => t === 'Dr Lee' && h === '/therapeia/?open=visit%3Av1') && today.some(([t, h]) => t === 'Biology · Study' && h === '/melete/?open=session:ss1'), JSON.stringify(today));
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
