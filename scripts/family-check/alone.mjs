import { chromium } from 'playwright';
import { loadRegistry, surfaceIds } from '../apps/lib.mjs';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
// The apps this check covers, and the other apps' names it looks for, come from the manifest (`surfaces.alone`). Proairetos's own name is expected on these pages.
const APPS = await surfaceIds('alone');
const { APPS: MANIFEST } = await loadRegistry();
const NAMES = Object.fromEntries(MANIFEST.filter((app) => app.status !== 'main').map((app) => [app.id, app.name]));
const report = {};
for (const app of APPS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const problems = [];
  p.on('pageerror', (e) => problems.push('error: ' + String(e).slice(0, 160)));
  await p.clock.install({ time: new Date('2026-10-12T10:00:00') });
  await p.goto('http://localhost:4173/welcome/');
  await p.evaluate((a) => localStorage.setItem('proairetos.apps', JSON.stringify({ added: [a] })), app);
  await p.goto(`http://localhost:4173/${app}/`); await p.waitForTimeout(1300);
  if (await p.locator('.added-only').count()) problems.push('shows AddedOnly');
  for (const n of ['Begin', 'Get started']) { const x = p.getByRole('button', { name: n, exact: true }); if (await x.count()) { await x.first().click(); await p.waitForTimeout(900); break; } }
  const cancel = p.getByRole('button', { name: 'Cancel', exact: true }); if (await cancel.count()) { await cancel.first().click(); await p.waitForTimeout(700); }
  const seen = new Set();
  const look = async (where) => {
    const text = await p.evaluate(() => document.body.innerText);
    for (const [id, name] of Object.entries(NAMES)) {
      if (id === app) continue;
      if (new RegExp(`\\b${name}\\b`, 'i').test(text)) {
        const line = text.split('\n').find((l) => new RegExp(`\\b${name}\\b`, 'i').test(l));
        const key = `${name} on ${where}: "${line?.trim().slice(0, 90)}"`;
        if (!seen.has(key)) { seen.add(key); problems.push(key); }
      }
    }
  };
  await look('first page');
  // Every tab in the bar (phone bottom bar or side rail).
  const tabs = await p.locator('nav button, .tab-bar button, [role="tablist"] button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.textContent?.trim()).filter(Boolean));
  for (const t of new Set(tabs)) {
    const btn = p.locator('nav button, .tab-bar button').filter({ hasText: t }).first();
    if (!(await btn.count())) continue;
    await btn.click().catch(() => {}); await p.waitForTimeout(700);
    await look(t);
  }
  report[app] = problems;
  await ctx.close();
}
console.log(JSON.stringify(report, null, 1));
await b.close();
