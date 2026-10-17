/*
 * Lamplight visual smoke coverage.
 *
 * Start a preview server first, then run:
 *   npm run smoke:visual
 *
 * The runner writes screenshots to VISUAL_OUT (or /tmp/proairetos-visual) and
 * fails on page errors, horizontal overflow, duplicate roots, or a missing
 * visible title on an app that has a title frame.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? '/opt/codex/cua_node/lib/node_modules/playwright/index.js';
const playwright = await import(playwrightModule);
const { chromium } = playwright.default ?? playwright;
const baseUrl = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4192';
const outputDir = process.env.VISUAL_OUT ?? '/tmp/proairetos-visual';
mkdirSync(outputDir, { recursive: true });

const apps = ['proairetos', 'askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'];
const viewports = [
  { name: 'phone-dark', width: 390, height: 844, colorScheme: 'dark' },
  { name: 'phone-light', width: 390, height: 844, colorScheme: 'light' },
  { name: 'desktop-dark', width: 1440, height: 900, colorScheme: 'dark' },
];
const titleSelectors = ['.page-header__title', '.page-hero__title', '.home__title', '.hero__title', '.title', '.praxis-page-heading h1', '.theoria-heading h1', '.hydros-header h1', '.hydros-hero__words > p', 'main h1'];

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: viewport.colorScheme, serviceWorkers: 'block' });
  await context.addInitScript(({ apps: seededApps }) => {
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: seededApps.filter((app) => app !== 'proairetos') }));
    for (const app of seededApps.filter((app) => !['proairetos', 'praxis', 'theoria', 'hydros'].includes(app))) localStorage.setItem(`${app}:settings`, JSON.stringify({ started: true, safetySeen: true }));
  }, { apps });

  for (const app of apps) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const path = app === 'proairetos' ? '/' : `/${app}/`;
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    const state = await page.evaluate((selectors) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const title = selectors.flatMap((selector) => [...document.querySelectorAll(selector)].filter(visible)).at(0);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        roots: document.querySelectorAll('#root > *').length,
        title: title?.textContent?.trim() ?? null,
        titleRect: title?.getBoundingClientRect().toJSON() ?? null,
      };
    }, titleSelectors);
    const name = `${app}-${viewport.name}`;
    await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: false });
    const result = { app, viewport: viewport.name, errors, ...state };
    results.push(result);
    if (errors.length || state.overflow || state.roots !== 1 || !state.title) failures.push(result);
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ checked: results.length, failures, outputDir }, null, 2));
if (failures.length) process.exitCode = 1;
