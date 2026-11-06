// Runs the storage diagnostic in Chromium to prove the tool itself works. This is NOT an iPhone result: it shows that
// pages in one browser context see each other's marks, pages in separate contexts do not, and that cleanup removes
// everything. Run: npm run build, npx vite preview --port 4173, then node scripts/diag/selftest.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const apps = ['hydros', 'soma', 'melete'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const results = [];
const ok = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
const reportOf = async (page) => JSON.parse(await page.inputValue('#json'));
const open = async (ctx, app) => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lab/diag/${app}/`);
  await page.waitForSelector('#table tr');
  return page;
};
const seen = (r) => ({
  ls: r.marksSeen.localStorage.map((m) => m.app).sort(),
  idb: r.marksSeen.indexedDB.map((m) => m.app).sort(),
  cache: r.marksSeen.cacheStorage.map((m) => m.app).sort(),
  cookie: r.marksSeen.cookies.map((m) => m.app).sort(),
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One context: every page shares storage, as Safari tabs do.
{
  const ctx = await browser.newContext();
  const pages = {};
  for (const app of apps) pages[app] = await open(ctx, app);
  for (const app of apps) {
    await pages[app].click('#write');
    await pages[app].waitForTimeout(400);
  }
  await pages.hydros.click('#read');
  await pages.hydros.waitForTimeout(500);
  const r = await reportOf(pages.hydros);
  const s = seen(r);
  ok('one context: localStorage, IndexedDB, Cache Storage and cookies show all three marks', [s.ls, s.idb, s.cache, s.cookie].every((x) => same(x, ['hydros', 'melete', 'soma'])), JSON.stringify(s));
  ok('one context: BroadcastChannel carries the other pages', new Set(r.broadcastHeard.map((h) => h.app)).size >= 2, JSON.stringify(r.broadcastHeard.map((h) => h.app)));
  ok('one context: each diagnostic worker is listed', r.environment.serviceWorkers.length >= 1, r.environment.serviceWorkers.map((w) => w.scope).join(' '));
  ok('display mode is read', r.environment.displayMode === 'browser', r.environment.displayMode);
  ok('storage estimate is read', typeof r.environment.storageQuotaBytes === 'number', `${r.environment.storageUsageBytes}/${r.environment.storageQuotaBytes}`);
  // Cleanup, then nothing is left that the diagnostic made.
  await pages.hydros.click('#clean');
  await pages.hydros.waitForTimeout(600);
  const after = await reportOf(pages.hydros);
  const left = seen(after);
  ok('cleanup removes every mark, cache, cookie and worker it made', Object.values(left).every((x) => x.length === 0) && after.environment.cacheNames.filter((n) => n.startsWith('proairetos-diag-')).length === 0 && after.environment.serviceWorkers.filter((w) => w.scope.includes('/lab/diag/')).length === 0, JSON.stringify(left));
  // It never touches anything it did not make.
  await pages.hydros.evaluate(() => localStorage.setItem('someone.else', '1'));
  await pages.hydros.click('#clean');
  await pages.hydros.waitForTimeout(400);
  ok('cleanup leaves other keys alone', (await pages.hydros.evaluate(() => localStorage.getItem('someone.else'))) === '1');
  await ctx.close();
}

// Separate contexts: isolated storage, as separate Home Screen installs are expected to be.
{
  const contexts = await Promise.all(apps.map(() => browser.newContext()));
  const pages = await Promise.all(apps.map((app, i) => open(contexts[i], app)));
  for (const page of pages) {
    await page.click('#write');
    await page.waitForTimeout(300);
  }
  await pages[0].click('#read');
  await pages[0].waitForTimeout(500);
  const s = seen(await reportOf(pages[0]));
  ok('separate contexts: each sees only its own marks', [s.ls, s.idb, s.cache, s.cookie].every((x) => same(x, ['hydros'])), JSON.stringify(s));
  for (const ctx of contexts) await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
process.exit(results.some((line) => line.startsWith('FAIL')) ? 1 : 0);
