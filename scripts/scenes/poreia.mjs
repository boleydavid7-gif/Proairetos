// Poreia's scene: a coast at dusk, the sun low over the sea with its path on the water, a headland with a lighthouse,
// a far sail, dark cliffs framing the foreground.
// Run: CHROMIUM=/opt/pw-browsers/chromium PLAYWRIGHT=<path to playwright> node scripts/scenes/poreia.mjs <out-dir>
// (writes poreia.webp and poreia-wide.webp at quality 85 straight from the browser).
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
import { writeFileSync } from 'node:fs';
import { LAMP_X, lampRing } from './engine.mjs';
const out = process.argv[2];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function ridge(w, h, base, amp, seed, detail = 1, from = 0, to = w) {
  const r = rng(seed);
  const waves = Array.from({ length: 5 }, (_, i) => ({ f: (0.6 + r() * 1.4) * (i + 1) * detail, p: r() * Math.PI * 2, a: amp / (i + 1.3) }));
  const pts = [];
  for (let step = 0; step <= 160; step++) {
    const x = from + ((to - from) * step) / 160;
    let y = base;
    for (const v of waves) y += Math.sin((x / w) * Math.PI * 2 * v.f + v.p) * v.a;
    pts.push(`${x.toFixed(1)},${(y * h).toFixed(1)}`);
  }
  return `M${from},${h} L${pts.join(' L')} L${to},${h} Z`;
}
/** A headland: rises from the left edge and falls into the sea at `tip`. */
function headland(w, h, top, sea, tip, seed) {
  const r = rng(seed);
  const pts = [];
  for (let step = 0; step <= 60; step++) {
    const t = step / 60;
    const x = tip * w * t;
    const fall = t < 0.7 ? 0 : ((t - 0.7) / 0.3) ** 1.6;
    const y = top + (sea - top) * fall + Math.sin(t * 9 + r() * 0.4) * 0.006;
    pts.push(`${x.toFixed(1)},${(y * h).toFixed(1)}`);
  }
  return `M0,${h} L0,${top * h} L${pts.join(' L')} L${tip * w},${h} Z`;
}
const grain = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.07 0"/></filter><filter id="soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter><filter id="blur" x="-0.2" y="-2" width="1.4" height="5"><feGaussianBlur stdDeviation="16"/></filter>`;

function poreia(w, h) {
  const s = Math.min(w, h) / 380;
  const horizon = h * 0.62;
  const sunX = w * LAMP_X, sunY = horizon - h * 0.035;
  const r = rng(29);
  // The sun's path on the water: short bright strokes, narrowing toward the horizon.
  const path = [];
  for (let i = 0; i < 70; i++) {
    const depth = r();
    const y = horizon + 4 + depth ** 1.6 * (h * 0.3);
    const spread = 6 + depth * w * 0.12;
    const x = sunX + (r() - 0.5) * spread * 2;
    const len = (6 + depth * 40) * (0.5 + r());
    path.push(`<rect x="${(x - len / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${len.toFixed(1)}" height="${(1.2 + depth * 2.5).toFixed(1)}" rx="1" fill="#fff2cf" opacity="${(0.75 - depth * 0.45).toFixed(2)}"/>`);
  }
  // Long swells across the sea.
  const swells = Array.from({ length: 14 }, (_, i) => {
    const y = horizon + 10 + (i / 14) ** 1.5 * h * 0.33;
    return `<rect x="0" y="${y.toFixed(1)}" width="${w}" height="${(1 + i * 0.25).toFixed(1)}" fill="#9fe3e0" opacity="${(0.08 + i * 0.006).toFixed(3)}"/>`;
  }).join('');
  const lx = w * 0.17, ly = h * 0.535;
  const lighthouse = `<g transform="translate(${lx},${ly}) scale(${s})">
    <path d="M-5,0 L-3.5,-34 L3.5,-34 L5,0 Z" fill="#e8f3ef"/>
    <path d="M-4.6,-12 L4.6,-12 L4.4,-17 L-4.4,-17 Z M-4,-25 L4,-25 L3.8,-29 L-3.8,-29 Z" fill="#c75e4c" opacity="0.85"/>
    <rect x="-4.5" y="-41" width="9" height="7" fill="#123036"/>
    <circle cx="0" cy="-37.5" r="2.6" fill="#fff4c6"/>
    <circle cx="0" cy="-37.5" r="18" fill="#fff4c6" opacity="0.18" filter="url(#soft)"/>
    <path d="M-5,-41 L0,-47 L5,-41 Z" fill="#0e2a2f"/>
  </g>`;
  const sail = `<g transform="translate(${w * 0.82},${horizon - 2}) scale(${s * 0.55})">
    <path d="M0,0 L0,-26 L11,-2 Z" fill="#f5efe1" opacity="0.9"/><path d="M-1,-22 L-1,0 L-9,-2 Z" fill="#e4dccb" opacity="0.85"/>
    <path d="M-12,0 L14,0 L10,4 L-9,4 Z" fill="#0f2b30"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061a22"/><stop offset="0.3" stop-color="#0f4a55"/><stop offset="0.5" stop-color="#4fb2b4"/><stop offset="0.6" stop-color="#f3d9a6"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9ea3"/><stop offset="0.35" stop-color="#1b6670"/><stop offset="1" stop-color="#062a31"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.62}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.95"/><stop offset="0.15" stop-color="#f6d6a0" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${horizon}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.034}" fill="#fff8e4"/>${lampRing(sunX, sunY, Math.min(w, h), '#fff3d4')}
  <path d="${ridge(w, h, 0.605, 0.012, 401, 1.3, w * 0.45, w)}" fill="#3d8a92" opacity="0.7"/>
  <rect x="0" y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#sea)"/>
  <rect x="0" y="${horizon - h * 0.01}" width="${w}" height="${h * 0.03}" fill="#fbe6bd" opacity="0.28" filter="url(#blur)"/>
  ${swells}
  ${path.join('')}
  ${sail}
  <path d="${headland(w, h, 0.54, 0.64, 0.42, 7)}" fill="#14424a"/>
  ${lighthouse}
  <path d="${headland(w, h, 0.66, 0.8, 0.26, 11)}" fill="#0b2b31"/>
  <path d="${ridge(w, h, 0.9, 0.03, 417, 0.8, w * 0.62, w)}" fill="#082329"/>
  <path d="${ridge(w, h, 0.95, 0.02, 421, 0.6)}" fill="#05181c"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [suffix, w, h] of [['', 852, 1846], ['-wide', 1672, 941]]) {
  await page.setViewportSize({ width: w, height: h });
  const svg = poreia(w, h);
  const data = await page.evaluate(async ({ svg, w, h }) => {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.85);
  }, { svg, w, h });
  writeFileSync(`${out}/poreia${suffix}.webp`, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();
