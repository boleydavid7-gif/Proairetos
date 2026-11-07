// Fresh screenshots of Proairetos with sample content, for the front page and the install prompt.
// Build, start `npx vite preview --port 4318`, then run: node scripts/welcome/shots.mjs
// Writes PNGs to .visual/shots/ (ignored by git) and the three the manifests and front page use, as webp at quality
// 85, to public/screenshots/: narrow-1 (Today), narrow-2 (Days ahead), wide-1 (Today on a computer).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const base = process.env.SHOTS_URL ?? 'http://localhost:4318';
const out = '.visual/shots';
mkdirSync(out, { recursive: true });

// A Tuesday morning, so Today has a day ahead of it.
const now = new Date('2026-11-03T08:40:00');
const things = [
  'Call the dentist about the cleaning tomorrow 10am',
  'Walk with Maya today 6pm',
  'Team review today 2pm',
  'Pick up the library books',
  'Renew passport',
  'Groceries for the week',
  'Look into a pottery class',
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const size of [{ name: 'narrow', width: 390, height: 844, scale: 2 }, { name: 'wide', width: 1280, height: 800, scale: 1 }]) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.clock.install({ time: now });
  await page.goto(`${base}/`);
  await page.evaluate(() => {
    localStorage.setItem('proairetos.onboarded', 'yes');
    localStorage.setItem('proairetos.displayName', JSON.stringify('Sam'));
    localStorage.setItem('proairetos.valuesInviteAside', 'yes');
  });
  await page.reload();
  await page.waitForTimeout(1500);
  for (const words of things) {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(200);
    await page.getByLabel('Go anywhere, or write something down').fill(words);
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
  }
  await page.goto(`${base}/`);
  await page.waitForTimeout(1500);
  await page.locator('button.intention').click();
  await page.locator('.intention input, .intention textarea, form input[type=text]').first().fill('Be patient with the morning');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${size.name}-today.png` });
  await page.screenshot({ path: `${out}/${size.name}-today-full.png`, fullPage: true });
  await page.goto(`${base}/?open=reflect`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${size.name}-reflect.png` });
  await page.goto(`${base}/plan`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${size.name}-days.png` });
  await ctx.close();
}
await browser.close();
const keep = { 'narrow-today': 'narrow-1', 'narrow-days': 'narrow-2', 'wide-today': 'wide-1' };
for (const [from, to] of Object.entries(keep)) await sharp(`${out}/${from}.png`).webp({ quality: 85 }).toFile(`public/screenshots/${to}.webp`);
console.log('Wrote', out, 'and public/screenshots/');
