// Photographs every app's main places (each place on its dock, rail or sidebar) in dark and light, on a phone and a
// computer, so a change can be looked over and compared with the run before it (compare.mjs). Run against
// `npm run build` + `npx vite preview --port 4173`:
//   node scripts/visual-check/shoot.mjs .visual/before   (then change things, rebuild)
//   node scripts/visual-check/shoot.mjs .visual/after
//   node scripts/visual-check/compare.mjs .visual/before .visual/after
// Options by environment: APPS=askesis,soma  SIZES=phone|desktop  THEMES=dark|light  CHROMIUM=path  BASE=url.
// Motion is reduced and the clock fixed, so two runs of the same build match.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));

const ALL = ['proairetos', 'askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia'];
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const out = process.argv[2] || '.visual/now';
const apps = process.env.APPS ? process.env.APPS.split(',') : ALL;
const sizes = process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(SIZES);
const themes = process.env.THEMES ? process.env.THEMES.split(',') : ['dark', 'light'];
const BASE = process.env.BASE || 'http://localhost:4173';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const problems = [];
let count = 0;

// The places an app offers in its own navigation: dock items, the rail they become on computers, or a sidebar.
const PLACES = ':is(.tab-bar, .hydros-tabs, .praxis-bottom-nav, .theoria-bottom-nav, .praxis-sidebar nav, .theoria-nav-list) :is(a, button)';

for (const size of sizes) {
  for (const theme of themes) {
    // One browser profile per size and appearance: every app is set up the same way, so they can share it.
    const ctx = await browser.newContext({ viewport: SIZES[size], serviceWorkers: 'block', reducedMotion: 'reduce' });
      await ctx.addInitScript(([apps, theme]) => {
        if (sessionStorage.getItem('visual-check')) return;
        localStorage.setItem('proairetos.onboarded', 'yes');
        localStorage.setItem('proairetos.apps', JSON.stringify({ added: apps.filter((app) => app !== 'proairetos') }));
        for (const app of apps) localStorage.setItem(`${app}:settings`, JSON.stringify({ started: true }));
        localStorage.setItem('proairetos.appearance', JSON.stringify({ theme, textSize: 'default' }));
        sessionStorage.setItem('visual-check', '1');
      }, [ALL, theme]);
    for (const app of apps) {
      const page = await ctx.newPage();
      page.setDefaultTimeout(8000);
      await page.clock.setFixedTime(new Date('2026-10-22T10:00:00'));
      page.on('pageerror', (error) => problems.push(`${size} ${theme} ${app}: ${String(error).slice(0, 160)}`));
      const shoot = async (place) => {
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(out, `${app}-${place}-${size}-${theme}.png`), fullPage: true, animations: 'disabled', timeout: 20000 }).then(
          () => count++,
          () => problems.push(`${size} ${theme} ${app}: no picture of ${place}`),
        );
        // A place that opened a dialog (Theoria's reader with no book) closes it before the next one.
        await page.keyboard.press('Escape').catch(() => undefined);
      };
      await page.goto(`${BASE}/${app === 'proairetos' ? '' : `${app}/`}`);
      await page.waitForTimeout(1200);
      await shoot('home');
      const names = await page.evaluate((selector) => {
        const seen = new Set();
        return [...document.querySelectorAll(selector)]
          .filter((each) => each.getClientRects().length && !each.hasAttribute('data-to-header') && each.getAttribute('aria-current') !== 'page')
          .filter((each) => !(each instanceof HTMLAnchorElement && new URL(each.href).pathname !== location.pathname))
          .map((each) => (each.getAttribute('aria-label') || each.textContent || '').trim())
          .filter((name) => name && name !== 'Apps' && !seen.has(name) && seen.add(name));
      }, PLACES);
      for (const name of names) {
        const target = page.locator(PLACES).filter({ visible: true }).filter({ hasText: name }).first();
        const byLabel = page.locator(`${PLACES}[aria-label="${name}"]`).filter({ visible: true }).first();
        const control = (await byLabel.count()) ? byLabel : target;
        if (!(await control.count().catch(() => 0))) continue;
        if (!(await control.click({ timeout: 4000 }).then(() => true, () => false))) {
          problems.push(`${size} ${theme} ${app}: could not open ${name}`);
          continue;
        }
        await shoot(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`${count} pictures in ${out}`);
if (problems.length) console.log(problems.join('\n'));
