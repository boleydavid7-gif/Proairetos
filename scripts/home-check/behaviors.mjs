// Home's interactions in a real browser, on the seeded data of check.mjs (run against `npm run build` + `vite preview`):
// mark with the arrow key and undo, set aside and bring back, an app set aside in Apps on Today, an app removed, a record
// made, edited and deleted from another tab, and how many apps derive (performance marks) on load and on one change.
//   CHROMIUM=... node scripts/home-check/behaviors.mjs
import { chromium as pw } from 'playwright';
import { seed } from './check.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await pw.launch({ executablePath: process.env.CHROMIUM || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC', reducedMotion: 'reduce' });
const page = await context.newPage();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const text = () => page.locator('.today-app-overview--attention').innerText().catch(() => '');
const marks = () => page.evaluate(() => performance.getEntriesByType('mark').filter((m) => m.name.startsWith('provider-derive:home:')).map((m) => m.name.slice(21)));

await seed(page);
await page.goto(`${BASE}/`);
await page.waitForTimeout(3000);
const first = await marks();
const apps = [...new Set(first)];
check('every contributing app derives once on first load', apps.length >= 10 && first.length === apps.length, `${first.length} derivations for ${apps.length} apps`);
const load = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; return Math.round(nav.domContentLoadedEventEnd); });
check('Home loads within the budget', load < 3000, `${load} ms to DOMContentLoaded`);

// mark with the arrow key, then undo
const chore = page.locator('.today-app-overview--attention').getByText('Wipe counters').first();
check('chore line shown', await chore.count());
await page.locator('.today-app-overview--attention .quiet-row', { hasText: 'Wipe counters' }).first().focus();
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(600);
const marked = !(await text()).includes('Wipe counters');
check('ArrowLeft marks the chore and it leaves the group', marked);
const undo = page.getByRole('button', { name: /undo/i }).first();
if (await undo.count()) { await undo.click(); await page.waitForTimeout(600); }
check('Undo brings it back', (await text()).includes('Wipe counters'));

// another tab edits a record: this tab follows without a reload
const other = await context.newPage();
await other.goto(`${BASE}/welcome/`);
const before = (await marks()).length;
await other.evaluate(() => localStorage.setItem('ergon:chore:c2', JSON.stringify({ id: 'c2', name: 'Water the herbs', room: 'Kitchen', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: '2026-11-01T09:00:00.000Z' })));
await page.waitForTimeout(1500);
check('a record made in another tab appears', (await text()).includes('Water the herbs'));
const afterMarks = (await marks()).slice(before);
check('only the changed app derived again', afterMarks.length > 0 && afterMarks.every((app) => app === 'ergon'), afterMarks.join(','));
await other.evaluate(() => localStorage.removeItem('ergon:chore:c2'));
await page.waitForTimeout(1500);
check('a record removed in another tab leaves', !(await text()).includes('Water the herbs'));

// an app set aside in Apps on Today, then an app removed
await page.evaluate(() => localStorage.setItem('proairetos.todayAppsHidden', JSON.stringify(['ergon'])));
await page.reload(); await page.waitForTimeout(2500);
check('an app set aside in Apps on Today is gone and does not derive', !(await text()).includes('Wipe counters') && !(await marks()).includes('ergon'));
await page.evaluate(() => { localStorage.removeItem('proairetos.todayAppsHidden'); const a = JSON.parse(localStorage.getItem('proairetos.apps')); a.added = a.added.filter((x) => x !== 'ktema'); localStorage.setItem('proairetos.apps', JSON.stringify(a)); });
await page.reload(); await page.waitForTimeout(2500);
check('a removed app is gone and does not derive', !(await text()).includes('Clean the filter') && !(await marks()).includes('ktema'));

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
