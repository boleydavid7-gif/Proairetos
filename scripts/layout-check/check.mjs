// Measures what drifts without anyone noticing: the dock's line over the current icon, the undo bar clear of the
// dock, top-bar icons centered in their buttons, and tap targets of at least 44 px. Run against `npm run build` +
// `npx vite preview --port 4173`; CHROMIUM may point at a browser (in the cloud: /opt/pw-browsers/chromium).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// Playwright from the project if installed, else the global one.
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));

const APPS = ['', 'askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia'];
const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const problems = [];

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(([apps, theme]) => {
    if (sessionStorage.getItem('layout-check')) return;
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps.filter(Boolean) }));
    for (const app of apps.filter(Boolean)) localStorage.setItem(`${app}:settings`, JSON.stringify({ started: true }));
    localStorage.setItem('proairetos.appearance', JSON.stringify({ theme, textSize: 'default' }));
    sessionStorage.setItem('layout-check', '1');
  }, [APPS, theme]);
  const page = await ctx.newPage();
  page.on('pageerror', (error) => problems.push(`${theme}: page error: ${String(error).slice(0, 160)}`));
  for (const app of APPS) {
    const name = app || 'proairetos';
    await page.goto(`${BASE}/${app}${app ? '/' : ''}`);
    await page.waitForTimeout(1400);
    const found = await page.evaluate(() => {
      const out = [];
      const dock = document.querySelector('.tab-bar, .hydros-tabs, .praxis-bottom-nav, .theoria-bottom-nav');
      if (dock && getComputedStyle(dock).display !== 'none' && dock.getBoundingClientRect().top > innerHeight / 2) {
        const current = [...dock.querySelectorAll('[aria-current="page"]')].find((each) => each.getClientRects().length);
        const icon = current?.querySelector('svg, img');
        if (icon) {
          const box = dock.getBoundingClientRect();
          const line = getComputedStyle(dock, '::after');
          const lineX = box.left + dock.clientLeft + parseFloat(line.left);
          const mark = icon.getBoundingClientRect();
          const off = mark.left + mark.width / 2 - lineX;
          if (Math.abs(off) > 1.5) out.push(`dock line ${off.toFixed(1)} px off its icon`);
        }
      }
      for (const button of document.querySelectorAll('.ll-topbar :is(button, a)')) {
        if (!button.getClientRects().length || button.textContent.trim().length > 2) continue;
        const icon = button.querySelector('svg, img');
        if (!icon) continue;
        const a = button.getBoundingClientRect();
        const b = icon.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) out.push(`top-bar icon off center (${dx.toFixed(1)}, ${dy.toFixed(1)}) in ${button.getAttribute('aria-label') || button.className}`);
        if (a.width < 43.5 || a.height < 43.5) out.push(`top-bar target ${Math.round(a.width)}x${Math.round(a.height)} (${button.getAttribute('aria-label') || button.className})`);
      }
      return out;
    });
    for (const each of found) problems.push(`${theme} ${name}: ${each}`);
  }
  await ctx.close();
}

// The undo bar sits clear of the dock (Ergon has a chore to tick).
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('layout-check')) return;
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['ergon'] }));
    localStorage.setItem('ergon:settings', JSON.stringify({ started: true, me: '', notices: { on: false, at: '09:00', onlyMine: false } }));
    localStorage.setItem('ergon:chore:a', JSON.stringify({ id: 'a', name: 'Dishes', repeat: { kind: 'days', every: 1 }, history: [], start: '2020-01-01', createdAt: '2020-01-01T00:00:00Z' }));
    sessionStorage.setItem('layout-check', '1');
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ergon/`);
  await page.waitForTimeout(1400);
  await page.locator('.tick').first().click();
  await page.waitForTimeout(600);
  const gap = await page.evaluate(() => {
    const bar = document.querySelector('.ll-undo')?.getBoundingClientRect();
    const dock = document.querySelector('.tab-bar');
    return bar && dock ? dock.offsetTop - bar.bottom : undefined;
  });
  if (gap === undefined) problems.push('ergon: no undo bar after ticking a chore');
  else if (gap < 4) problems.push(`ergon: undo bar ${gap.toFixed(1)} px from the dock`);
  await ctx.close();
}

await browser.close();
if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('Layout check: nothing drifted.');
