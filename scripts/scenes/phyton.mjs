// Phyton's scene: a glasshouse in a green valley at morning, broad leaves in the foreground.
// Run: CHROMIUM=/opt/pw-browsers/chromium PLAYWRIGHT=<path to playwright> node scripts/scenes/phyton.mjs <out-dir>; then webp at quality 85.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
import { LAMP_X, lampRing } from './engine.mjs';
const out = process.argv[2];

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
function firs(w, h, base, seed, size, count) {
  const r = rng(seed); let d = '';
  for (let i = 0; i < count; i++) {
    const x = r() * w, s = size * (0.6 + r() * 0.8), y = base * h + (r() - 0.5) * size * 0.6;
    d += `M${x - s * 0.32},${y} L${x},${y - s * 1.5} L${x + s * 0.32},${y} Z `;
  }
  return d;
}
const grain = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.07 0"/></filter><filter id="blur" x="-0.2" y="-2" width="1.4" height="5"><feGaussianBlur stdDeviation="18"/></filter><filter id="soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter>`;

// A broad leaf from its base, pointing at an angle, with a midrib.
function leaf(x, y, len, angle, fill, rib) {
  const w = len * 0.42;
  return `<g transform="translate(${x},${y}) rotate(${angle})"><path d="M0,0 C${w},${-len * 0.25} ${w * 0.8},${-len * 0.8} 0,${-len} C${-w * 0.8},${-len * 0.8} ${-w},${-len * 0.25} 0,0 Z" fill="${fill}"/><path d="M0,0 L0,${-len * 0.92}" stroke="${rib}" stroke-width="${Math.max(1.5, len / 60)}" fill="none"/></g>`;
}

function phyton(w, h) {
  const s = Math.min(w, h) / 380;
  const sunX = w * LAMP_X, sunY = h * 0.55;
  const gx = w * 0.4, gy = h * 0.765;
  const panes = Array.from({ length: 7 }, (_, i) => `<path d="M${-48 + i * 16},0 L${-48 + i * 16},-34" stroke="#dfe9d2" stroke-width="1.6" opacity="0.7"/>`).join('');
  const house = `<g transform="translate(${gx},${gy}) scale(${s})">
    <path d="M-50,0 L-50,-34 L0,-60 L50,-34 L50,0 Z" fill="#cfe2c0" opacity="0.32"/>
    <path d="M-50,0 L-50,-34 L0,-60 L50,-34 L50,0 Z M-50,-34 L50,-34" stroke="#e8f0dc" stroke-width="2.4" fill="none" opacity="0.85"/>
    ${panes}
    <path d="M-25,-47 L-25,-34 M25,-47 L25,-34 M0,-60 L0,-34" stroke="#e8f0dc" stroke-width="1.6" opacity="0.7"/>
    <ellipse cx="0" cy="-12" rx="40" ry="11" fill="#5f8a4c" opacity="0.8"/>
    <circle cx="0" cy="-30" r="40" fill="#f7f0c8" opacity="0.12" filter="url(#soft)"/>
  </g>`;
  const r = rng(71);
  const front = [];
  for (let i = 0; i < 9; i++) front.push(leaf(w * (0.02 + r() * 0.2), h * 1.01, h * (0.12 + r() * 0.08), -50 + r() * 70, i % 2 ? '#1c2a1a' : '#162215', '#2c3d27'));
  for (let i = 0; i < 9; i++) front.push(leaf(w * (0.78 + r() * 0.22), h * 1.01, h * (0.12 + r() * 0.08), -20 + r() * 70, i % 2 ? '#1c2a1a' : '#142013', '#2c3d27'));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a14"/><stop offset="0.28" stop-color="#34503c"/><stop offset="0.48" stop-color="#a7c79a"/><stop offset="0.6" stop-color="#f1efc9"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe2" stop-opacity="0.9"/><stop offset="0.14" stop-color="#e9efb8" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.032}" fill="#fffce8"/>${lampRing(sunX, sunY, Math.min(w, h), '#fffbe2')}
  <path d="${ridge(w, h, 0.6, 0.03, 201, 1.1)}" fill="#86a97c" opacity="0.8"/>
  <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.045}" fill="#f4f6dc" opacity="0.35" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.66, 0.028, 207, 1)}" fill="#5f8458"/>
  <path d="${firs(w, h, 0.665, 41, h * 0.02, 34)}" fill="#4e7249"/>
  <path d="${ridge(w, h, 0.73, 0.018, 211, 0.7)}" fill="#40613d"/>
  ${house}
  <path d="${ridge(w, h, 0.79, 0.012, 213, 0.6)}" fill="#2f4a2e"/>
  <path d="${ridge(w, h, 0.88, 0.012, 217, 0.6)}" fill="#1d2d1c"/>
  ${front.join('')}
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [suffix, w, h] of [['', 852, 1846], ['-wide', 1672, 941]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${phyton(w, h)}</body></html>`);
  await page.screenshot({ path: `${out}/phyton${suffix}.png` });
}
await browser.close();
