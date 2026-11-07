// Before and after pictures of the calendar's dates for review. "Before" is the calendar as it is now. "After" is a
// preview only: the proposed kind markers are laid over the page inside the browser for the picture, and nothing in the
// app changes. Writes side-by-side sheets to OUT.
//   OUT=... CHROMIUM=... node scripts/calendar-check/shots.mjs   (against `npm run build` + `vite preview`)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { seed } from './check.mjs';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || '.visual/shots';
mkdirSync(OUT, { recursive: true });

/** The proposal, laid over the page: a glyph from the existing set and one muted word, on deadlines and dates that come round. */
function preview() {
  const TARGET = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.7" fill="currentColor"/>';
  const REPEAT = '<path d="M17 4.5l2.5 2.5L17 9.5M19.5 7H8a3.5 3.5 0 0 0-3.5 3.5v1M7 19.5 4.5 17 7 14.5M4.5 17H16a3.5 3.5 0 0 0 3.5-3.5v-1"/>';
  for (const line of document.querySelectorAll('.days-bills')) {
    const label = line.querySelector('span');
    const name = label.textContent;
    const yearly = /birthday|Anniversary/.test(name);
    const svg = line.querySelector('svg');
    svg.innerHTML = yearly ? REPEAT : TARGET;
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const word = yearly ? 'Every year' : /ends$/.test(name) ? '' : 'Due';
    if (word) {
      const small = document.createElement('span');
      small.textContent = ` · ${word}`;
      small.style.cssText = 'color: var(--color-text-faint); font-size: var(--text-sm);';
      label.appendChild(small);
    }
  }
}

async function label(buffer, text, width) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="36"><rect width="100%" height="100%" fill="#222"/><text x="12" y="24" font-family="sans-serif" font-size="18" fill="#fff">${text}</text></svg>`;
  const { height } = await sharp(buffer).metadata();
  return sharp({ create: { width, height: height + 36, channels: 3, background: '#222' } }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }, { input: buffer, top: 36, left: 0 }]).png().toBuffer();
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const files = [];
for (const [scheme, width, height] of [['dark', 390, 844], ['light', 390, 844], ['dark', 1440, 900], ['light', 1440, 900]]) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', timezoneId: 'UTC', colorScheme: scheme, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-11-05T12:00:00') });
  await seed(page);
  if (scheme === 'light') await page.evaluate(() => localStorage.setItem('proairetos.appearance', JSON.stringify({ theme: 'light', textSize: 'default' })));
  await page.goto(`${BASE}/plan`);
  await page.waitForTimeout(2200);
  const shoot = async (view, selector) => {
    const element = page.locator(selector).first();
    const before = await element.screenshot();
    await page.evaluate(preview);
    const after = await element.screenshot();
    const a = sharp(before), b = sharp(after);
    const [ma, mb] = [await a.metadata(), await b.metadata()];
    const w = ma.width + mb.width + 24;
    const left = await label(before, `Before: ${scheme}, ${width}px, ${view}`, ma.width);
    const right = await label(after, `After (preview): ${scheme}, ${width}px, ${view}`, mb.width);
    const sheet = await sharp({ create: { width: w, height: Math.max(ma.height, mb.height) + 36, channels: 3, background: '#555' } }).composite([{ input: left, left: 0, top: 0 }, { input: right, left: ma.width + 24, top: 0 }]).png().toBuffer();
    const file = join(OUT, `${view}-${scheme}-${width}.png`);
    await sharp(sheet).toFile(file);
    files.push(file);
  };
  await shoot('list', '.days-list-column');
  if (width === 1440) {
    await page.goto(`${BASE}/calendar`);
    await page.waitForTimeout(2000);
    await shoot('week', 'main');
  }
  await context.close();
}
await browser.close();
console.log(files.join('\n'));
