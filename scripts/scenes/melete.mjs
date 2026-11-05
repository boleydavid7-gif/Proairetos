// Meletē's scene: a low library with lit windows on an olive hillside at dusk.
// Run: node scripts/scenes/<file>.mjs <out-dir>; then convert each PNG to webp (ffmpeg -i x.png -quality 85 x.webp).
// Needs Playwright with a Chromium (set CHROMIUM to its path).
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
import { LAMP_X, lampRing } from './engine.mjs';
const out = process.argv[2];

// Small seeded random and a smooth ridge line from summed waves.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function ridge(w, h, base, amp, seed, detail = 1) {
  const r = rng(seed);
  const waves = Array.from({ length: 5 }, (_, i) => ({ f: (0.6 + r() * 1.4) * (i + 1) * detail, p: r() * Math.PI * 2, a: amp / (i + 1.3) }));
  const pts = [];
  for (let step = 0; step <= 160; step++) {
    const x = (w * step) / 160;
    let y = base;
    for (const v of waves) y += Math.sin((x / w) * Math.PI * 2 * v.f + v.p) * v.a;
    pts.push(`${x.toFixed(1)},${(y * h).toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
}
// A tree line: little pointed firs along a ridge.
function firs(w, h, base, seed, size, count) {
  const r = rng(seed); let d = '';
  for (let i = 0; i < count; i++) {
    const x = r() * w, s = size * (0.6 + r() * 0.8), y = base * h + (r() - 0.5) * size * 0.6;
    d += `M${x - s * 0.32},${y} L${x},${y - s * 1.5} L${x + s * 0.32},${y} Z `;
  }
  return d;
}
function stars(w, h, seed, n, maxY) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h * maxY).toFixed(1)}" r="${(0.5 + r() * 1.3).toFixed(2)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  return s;
}
const grain = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.07 0"/></filter><filter id="blur" x="-0.2" y="-2" width="1.4" height="5"><feGaussianBlur stdDeviation="18"/></filter><filter id="soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>`;

function melete(w, h) {
  const s = Math.min(w, h) / 380;
  const hx = w * 0.6, hy = h * 0.705;
  // A low library with a row of lit windows, and a path up to its door.
  const hall = `<g transform="translate(${hx},${hy}) scale(${s})">
    <rect x="-46" y="-30" width="92" height="30" fill="#232b18"/><path d="M-52,-28 L0,-50 L52,-28 Z" fill="#1a2012"/>
    <rect x="-38" y="-22" width="10" height="14" fill="#f2d283"/><rect x="-22" y="-22" width="10" height="14" fill="#f2d283" opacity="0.9"/><rect x="12" y="-22" width="10" height="14" fill="#f2d283" opacity="0.9"/><rect x="28" y="-22" width="10" height="14" fill="#f2d283"/>
    <rect x="-6" y="-18" width="12" height="18" fill="#12170c"/>
    <circle cx="0" cy="-14" r="40" fill="#f2d283" opacity="0.1" filter="url(#soft)"/>
  </g>`;
  const path = `<path d="M${hx},${hy} C${hx - 40 * s},${hy + 40 * s} ${w * 0.3},${h * 0.8} ${w * 0.28},${h * 0.92}" stroke="#e4d9a6" stroke-width="${Math.max(3, 7 * s)}" fill="none" opacity="0.28" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171d10"/><stop offset="0.3" stop-color="#3a4725"/><stop offset="0.52" stop-color="#9cac6c"/><stop offset="0.62" stop-color="#eee2b2"/></linearGradient>
  <radialGradient id="sun" cx="${w * LAMP_X}" cy="${h * 0.56}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff5d0" stop-opacity="0.85"/><stop offset="0.15" stop-color="#f1e1a8" stop-opacity="0.4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars(w, h, 31, Math.round(w * h / 60000), 0.14)}
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${w * LAMP_X}" cy="${h * 0.565}" r="${Math.min(w, h) * 0.032}" fill="#fff6dc"/>${lampRing(w * LAMP_X, h * 0.565, Math.min(w, h), '#fff1c4')}
  <path d="${ridge(w, h, 0.585, 0.03, 141, 1.2)}" fill="#869a62" opacity="0.8"/>
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.05}" fill="#f1ecc8" opacity="0.3" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.63, 0.03, 147, 1)}" fill="#5f7340"/>
  <path d="${firs(w, h, 0.64, 19, h * 0.025, 46)}" fill="#4f6335"/>
  <path d="${ridge(w, h, 0.7, 0.02, 153, 0.7)}" fill="#3b4d2a"/>
  ${hall}
  <path d="${ridge(w, h, 0.78, 0.03, 157, 0.8)}" fill="#2a381d"/>${path}
  <path d="${firs(w, h, 0.8, 23, h * 0.04, 20)}" fill="#1e2916"/>
  <path d="${ridge(w, h, 0.9, 0.02, 161, 0.6)}" fill="#10130b"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [name, draw] of Object.entries({ melete })) {
  for (const [suffix, w, h] of [['-stoic', 852, 1846], ['-stoic-wide', 1672, 941]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${draw(w, h)}</body></html>`);
    await page.screenshot({ path: `${out}/${name}${suffix}.png` });
  }
}
await browser.close();
