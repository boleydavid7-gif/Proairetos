// The speed budget, measured on a hard profile (the CPU four times slower, a 9 Mbit connection): first paint under a
// second and the whole first page (largest paint) within 1.4 s. Lists first paint, largest paint and the JavaScript
// loaded, and names any app past the budget (BUDGET_MS changes it). Run against `npm run build` + `npx vite preview --port
// 4173`; CHROMIUM may point at a browser (in the cloud: /opt/pw-browsers/chromium).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));

const ALL = ['', 'askesis', 'soma', 'oikonomia', 'poreia', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'mneme'];
// APPS=proairetos,soma narrows a run.
const APPS = process.env.APPS ? process.env.APPS.split(',').map((app) => (app === 'proairetos' ? '' : app)) : ALL;
const BASE = process.env.BASE || 'http://localhost:4173';
const BUDGET_MS = Number(process.env.BUDGET_MS || 1400);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const rows = [];

for (const app of APPS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript((apps) => {
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps.filter(Boolean) }));
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: [], owner: true, account: true }));
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }, ALL);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  let bytes = 0;
  page.on('response', async (response) => {
    if (!response.url().endsWith('.js')) return;
    bytes += (await response.body().catch(() => Buffer.alloc(0))).length;
  });
  await page.goto(`${BASE}/${app ? `${app}/` : ''}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const timing = await page.evaluate(() => ({
    fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0),
    lcp: Math.round(window.__lcp),
  }));
  rows.push({ app: app || 'proairetos', ...timing, jsKB: Math.round(bytes / 1024) });
  await ctx.close();
}

await browser.close();
console.table(rows);
const slow = rows.filter((row) => row.lcp > BUDGET_MS);
if (slow.length) {
  console.log(`Past the ${BUDGET_MS} ms budget: ${slow.map((row) => `${row.app} (${row.lcp} ms)`).join(', ')}`);
  process.exitCode = 1;
} else console.log(`Every app within ${BUDGET_MS} ms.`);
