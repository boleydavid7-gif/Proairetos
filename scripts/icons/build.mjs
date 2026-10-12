/*
 * Writes every app's icons from glyphs.mjs: the rounded SVG (browser tab, Store, app grid), PNGs at 192 and 512
 * (rounded, for computers), a full-bleed maskable 512 (Android crops it to its own shape) and a full-bleed 180
 * for the iPhone Home Screen (opaque; the phone rounds it). Run: node scripts/icons/build.mjs
 * Needs Playwright and its Chromium (at /opt/pw-browsers/chromium, or CHROMIUM=path).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS, iconSvg } from './glyphs.mjs';

const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const root = join(dirname(fileURLToPath(import.meta.url)), '../../public');

/** Where each app keeps its icons; Proairetos's are at the top of the site. */
function places(name) {
  if (name === 'proairetos') return { svg: ['icons/icon.svg', 'favicon.svg'], dir: 'icons' };
  const svg = name === 'praxis' || name === 'theoria' ? `${name}/favicon.svg` : `${name}/icon.svg`;
  return { svg: [svg], dir: `${name}/icons` };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

async function png(svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
}

for (const name of Object.keys(APPS)) {
  const { svg, dir } = places(name);
  const rounded = iconSvg(name, 'rounded');
  const square = iconSvg(name, 'square');
  for (const file of svg) writeFileSync(join(root, file), rounded + '\n');
  await png(rounded, 192, join(root, dir, 'icon-192.png'));
  await png(rounded, 512, join(root, dir, 'icon-512.png'));
  await png(square, 512, join(root, dir, 'icon-maskable-512.png'));
  await png(square, 180, join(root, dir, 'apple-touch-icon.png'));
  console.log('icons:', name);
}
await browser.close();
