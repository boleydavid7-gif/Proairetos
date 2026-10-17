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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? '/opt/codex/cua_node/lib/node_modules/playwright/index.js';
const playwright = await import(playwrightModule);
const { chromium } = playwright.default ?? playwright;
const baseUrl = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4192';
const outputDir = process.env.VISUAL_OUT ?? '/tmp/proairetos-visual';
const baselinePath = process.env.VISUAL_BASELINE ?? join(new URL('.', import.meta.url).pathname, 'baseline.json');
const updateBaseline = process.env.VISUAL_BASELINE_UPDATE === '1';
mkdirSync(outputDir, { recursive: true });

const apps = ['proairetos', 'askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'];
const viewports = [
  { name: 'phone-dark', width: 390, height: 844, colorScheme: 'dark' },
  { name: 'phone-light', width: 390, height: 844, colorScheme: 'light' },
  { name: 'iphone-touch', width: 393, height: 852, colorScheme: 'dark', isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'desktop-dark', width: 1440, height: 900, colorScheme: 'dark' },
];
const titleSelectors = ['.page-header__title', '.page-hero__title', '.home__title', '.hero__title', '.title', '.praxis-page-heading h1', '.theoria-heading h1', '.hydros-header h1', '.hydros-hero__words > p', 'main h1'];

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [];
const results = [];

function baselineEntry(result) {
  return {
    app: result.app,
    viewport: result.viewport,
    titleY: result.titleRect ? Math.round(result.titleRect.y) : null,
    titleHeight: result.titleRect ? Math.round(result.titleRect.height) : null,
    overflow: result.overflow,
    roots: result.roots,
    titleClipped: result.titleClipped,
    unnamedButtons: result.unnamedButtons.length,
  };
}

function compareBaseline(actual, expected) {
  const byKey = new Map(expected.entries.map((entry) => [`${entry.app}:${entry.viewport}`, entry]));
  return actual.flatMap((entry) => {
    const key = `${entry.app}:${entry.viewport}`;
    const wanted = byKey.get(key);
    if (!wanted) return [{ ...entry, baseline: `missing entry ${key}` }];
    const geometryChanged = wanted.titleY === null
      ? entry.titleY !== null
      : entry.titleY === null || Math.abs(entry.titleY - wanted.titleY) > 3 || Math.abs(entry.titleHeight - wanted.titleHeight) > 3;
    const invariantChanged = entry.overflow !== wanted.overflow || entry.roots !== wanted.roots || entry.titleClipped !== wanted.titleClipped || entry.unnamedButtons !== wanted.unnamedButtons;
    return geometryChanged || invariantChanged ? [{ ...entry, baseline: { wanted, geometryChanged, invariantChanged } }] : [];
  });
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: viewport.colorScheme,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    serviceWorkers: 'block',
  });
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
      const titleRect = title?.getBoundingClientRect();
      const unnamedButtons = [...document.querySelectorAll('button, [role="button"], [role="switch"]')]
        .filter(visible)
        .filter((element) => {
          const labelledBy = element.getAttribute('aria-labelledby');
          const labelledText = labelledBy ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') : '';
          return !(element.getAttribute('aria-label') || labelledText.trim() || element.getAttribute('title') || element.textContent?.trim());
        })
        .map((element) => element.outerHTML.slice(0, 160));
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        roots: document.querySelectorAll('#root > *').length,
        title: title?.textContent?.trim() ?? null,
        titleRect: titleRect?.toJSON() ?? null,
        titleClipped: Boolean(titleRect && (titleRect.top < 0 || titleRect.bottom > innerHeight)),
        unnamedButtons,
      };
    }, titleSelectors);
    const name = `${app}-${viewport.name}`;
    await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: false });
    const result = { app, viewport: viewport.name, errors, ...state };
    results.push(result);
    if (errors.length || state.overflow || state.roots !== 1 || !state.title || state.titleClipped || state.unnamedButtons.length) failures.push(result);
    await page.close();
  }
  await context.close();
}

await browser.close();
const layout = results.map(baselineEntry);
if (updateBaseline) writeFileSync(baselinePath, `${JSON.stringify({ version: 1, entries: layout }, null, 2)}\n`);
else if (existsSync(baselinePath)) failures.push(...compareBaseline(layout, JSON.parse(readFileSync(baselinePath, 'utf8'))));
console.log(JSON.stringify({ checked: results.length, failures, outputDir, baselinePath, baselineUpdated: updateBaseline }, null, 2));
if (failures.length) process.exitCode = 1;
