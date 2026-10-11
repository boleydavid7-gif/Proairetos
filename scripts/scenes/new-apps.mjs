// Run: node scripts/scenes/<file>.mjs <out-dir>; then convert each PNG to webp (ffmpeg -i x.png -quality 85 x.webp).
// Needs Playwright with a Chromium (set CHROMIUM to its path).
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
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

function diaita(w, h) {
  const sunX = w * 0.68, sunY = h * 0.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f1e"/><stop offset="0.32" stop-color="#1c2345"/><stop offset="0.5" stop-color="#4a3d5c"/><stop offset="0.6" stop-color="#c47f4e"/><stop offset="0.66" stop-color="#f0b46a"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.55}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe2a8" stop-opacity="0.95"/><stop offset="0.12" stop-color="#f6b46a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#d0804c" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars(w, h, 7, Math.round(w * h / 9000), 0.36)}
  <circle cx="${w * 0.24}" cy="${h * 0.14}" r="${Math.min(w, h) * 0.05}" fill="#efe6d2"/><circle cx="${w * 0.24 + Math.min(w, h) * 0.022}" cy="${h * 0.14 - Math.min(w, h) * 0.012}" r="${Math.min(w, h) * 0.046}" fill="#141a33"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY + h * 0.012}" r="${Math.min(w, h) * 0.045}" fill="#fff1cf"/>
  <path d="${ridge(w, h, 0.585, 0.025, 11, 1.2)}" fill="#7a5a74"/>
  <rect x="0" y="${h * 0.57}" width="${w}" height="${h * 0.05}" fill="#f2c487" opacity="0.25" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.63, 0.035, 23, 1)}" fill="#3d3456"/>
  <rect x="0" y="${h * 0.64}" width="${w}" height="${h * 0.04}" fill="#d9a17a" opacity="0.22" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.69, 0.04, 31, 0.9)}" fill="#272642"/>
  <path d="${firs(w, h, 0.705, 5, h * 0.03, 60)}" fill="#1d1d33"/>
  <path d="${ridge(w, h, 0.77, 0.035, 41, 0.8)}" fill="#171a2c"/>
  <path d="${firs(w, h, 0.79, 9, h * 0.045, 40)}" fill="#12152a"/>
  <path d="${ridge(w, h, 0.87, 0.025, 53, 0.7)}" fill="#0e1014"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

function philia(w, h) {
  const sunX = w * 0.5, sunY = h * 0.52;
  const lake = h * 0.66;
  const tree = (x, s, flip) => `<g transform="translate(${x},${lake - h * 0.005}) scale(${flip ? -s : s},${s})"><path d="M-3,0 C-3,-40 -2,-70 0,-95 C2,-70 3,-40 3,0 Z" fill="#2a1a1d"/><ellipse cx="0" cy="-118" rx="34" ry="40" fill="#3a2226"/><ellipse cx="-18" cy="-98" rx="22" ry="20" fill="#3a2226"/><ellipse cx="17" cy="-104" rx="24" ry="22" fill="#33201f"/></g>`;
  const s = Math.min(w, h) / 380;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1c2a"/><stop offset="0.28" stop-color="#6b3b48"/><stop offset="0.46" stop-color="#d27a6a"/><stop offset="0.6" stop-color="#f3b08a"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff0d8" stop-opacity="0.95"/><stop offset="0.1" stop-color="#f9c79a" stop-opacity="0.6"/><stop offset="0.45" stop-color="#e08a74" stop-opacity="0.15"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7a17f"/><stop offset="0.35" stop-color="#8a4f57"/><stop offset="1" stop-color="#2a1a20"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars(w, h, 3, Math.round(w * h / 30000), 0.18)}
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.06}" fill="#fff4e2" opacity="0.95"/>
  <path d="${ridge(w, h, 0.6, 0.03, 61, 1.1)}" fill="#a35e62" opacity="0.8"/>
  <path d="${ridge(w, h, 0.635, 0.025, 67, 1)}" fill="#6e3d48"/>
  <rect x="0" y="${lake}" width="${w}" height="${h - lake}" fill="url(#water)"/>
  <rect x="${sunX - w * 0.04}" y="${lake}" width="${w * 0.08}" height="${h * 0.16}" fill="#ffe6c8" opacity="0.35" filter="url(#blur)"/>
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${sunX - w * (0.03 + i * 0.006)}" y="${lake + h * (0.008 + i * 0.012)}" width="${w * (0.06 + i * 0.012)}" height="${h * 0.002}" fill="#fff0dc" opacity="${(0.5 - i * 0.03).toFixed(2)}"/>`).join('')}
  <path d="M0,${lake} C${w * 0.15},${lake - h * 0.03} ${w * 0.3},${lake - h * 0.035} ${w * 0.42},${lake} Z" fill="#3a2226"/>
  ${tree(w * 0.16, s * 1.05, false)}${tree(w * 0.31, s * 0.88, true)}
  <path d="${ridge(w, h, 0.9, 0.015, 71, 0.6)}" fill="#120f10" opacity="0.9"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

function ergon(w, h) {
  const s = Math.min(w, h) / 380;
  const hx = w * 0.6, hy = h * 0.705;
  const house = `<g transform="translate(${hx},${hy}) scale(${s})">
    <rect x="-34" y="-36" width="68" height="36" fill="#1e2a29"/><path d="M-42,-34 L0,-66 L42,-34 Z" fill="#162120"/>
    <rect x="16" y="-62" width="9" height="20" fill="#162120"/>
    <rect x="-22" y="-26" width="12" height="12" fill="#f4c67c"/><rect x="8" y="-26" width="12" height="12" fill="#f4c67c" opacity="0.85"/>
    <rect x="-6" y="-20" width="10" height="20" fill="#0f1716"/>
    <circle cx="-16" cy="-20" r="22" fill="#f4c67c" opacity="0.12" filter="url(#soft)"/>
  </g>`;
  const smoke = `<path d="M${hx + 20 * s},${hy - 64 * s} c${-8 * s},${-14 * s} ${10 * s},${-22 * s} ${0},${-36 * s} c${-8 * s},${-12 * s} ${12 * s},${-20 * s} ${4 * s},${-34 * s}" stroke="#dfe6e0" stroke-width="${5 * s}" fill="none" opacity="0.35" stroke-linecap="round" filter="url(#soft)"/>`;
  const rows = Array.from({ length: 9 }, (_, i) => `<path d="M${w * (0.05 + i * 0.03)},${h * (0.86 + i * 0.012)} Q${w * 0.35},${h * (0.8 + i * 0.012)} ${w * (0.5 - i * 0.01)},${h * (0.84 + i * 0.012)}" stroke="#2f4740" stroke-width="${Math.max(2, 3 * s)}" fill="none" opacity="0.7"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16232a"/><stop offset="0.3" stop-color="#3b5961"/><stop offset="0.52" stop-color="#9cb7a8"/><stop offset="0.62" stop-color="#e6dcbc"/></linearGradient>
  <radialGradient id="sun" cx="${w * 0.25}" cy="${h * 0.56}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3d2" stop-opacity="0.85"/><stop offset="0.15" stop-color="#f1dfb0" stop-opacity="0.4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${w * 0.25}" cy="${h * 0.565}" r="${Math.min(w, h) * 0.04}" fill="#fff6e0"/>
  <path d="${ridge(w, h, 0.585, 0.03, 81, 1.2)}" fill="#7d9a8e" opacity="0.8"/>
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.05}" fill="#eef0e2" opacity="0.3" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.63, 0.03, 87, 1)}" fill="#557466"/>
  <path d="${firs(w, h, 0.64, 13, h * 0.025, 50)}" fill="#46645a"/>
  <path d="${ridge(w, h, 0.7, 0.02, 93, 0.7)}" fill="#33504a"/>
  ${house}${smoke}
  <path d="${ridge(w, h, 0.78, 0.03, 97, 0.8)}" fill="#23362f"/>
  <path d="${firs(w, h, 0.8, 17, h * 0.04, 22)}" fill="#1a2925"/>
  <path d="${ridge(w, h, 0.9, 0.02, 101, 0.6)}" fill="#0e1112"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [name, draw] of Object.entries({ diaita, philia, ergon })) {
  for (const [suffix, w, h] of [['', 852, 1846], ['-wide', 1672, 941]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${draw(w, h)}</body></html>`);
    await page.screenshot({ path: `${out}/${name}${suffix}.png` });
  }
}
await browser.close();
