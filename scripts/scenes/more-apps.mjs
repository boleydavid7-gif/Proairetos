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

function therapeia(w, h) {
  const lake = h * 0.68;
  const sunX = w * 0.62, sunY = h * 0.5;
  const reeds = (x0, seed, n) => { const r = rng(seed); let d = ''; for (let i = 0; i < n; i++) { const x = x0 + r() * w * 0.22, t = h * (0.03 + r() * 0.05), b = h * 0.86 + r() * h * 0.03; d += `M${x},${b} Q${x + (r() - 0.5) * 18},${b - t / 2} ${x + (r() - 0.5) * 26},${b - t} `; } return d; };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a2a"/><stop offset="0.3" stop-color="#2e4566"/><stop offset="0.5" stop-color="#7f9cc4"/><stop offset="0.62" stop-color="#d9e1ea"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.55}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="0.14" stop-color="#e7eef7" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9cbe2"/><stop offset="0.4" stop-color="#4c6488"/><stop offset="1" stop-color="#121926"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars(w, h, 19, Math.round(w * h / 40000), 0.15)}
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.04}" fill="#fbfdff" opacity="0.9"/>
  <path d="${ridge(w, h, 0.6, 0.03, 111, 1.1)}" fill="#8aa2c4" opacity="0.75"/>
  <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.05}" fill="#eef3f9" opacity="0.4" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.645, 0.03, 117, 1)}" fill="#5a7398"/>
  <path d="${firs(w, h, 0.655, 23, h * 0.022, 55)}" fill="#4b6386"/>
  <rect x="0" y="${lake}" width="${w}" height="${h - lake}" fill="url(#water)"/>
  <rect x="0" y="${lake - h * 0.01}" width="${w}" height="${h * 0.03}" fill="#e6edf6" opacity="0.45" filter="url(#blur)"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${sunX - w * (0.03 + i * 0.006)}" y="${lake + h * (0.01 + i * 0.012)}" width="${w * (0.06 + i * 0.012)}" height="${h * 0.002}" fill="#ffffff" opacity="${(0.45 - i * 0.03).toFixed(2)}"/>`).join('')}
  <path d="${reeds(w * 0.02, 5, 26)}${reeds(w * 0.72, 9, 22)}" stroke="#1a2436" stroke-width="${Math.max(2, w / 300)}" fill="none" stroke-linecap="round"/>
  <path d="${ridge(w, h, 0.92, 0.012, 121, 0.6)}" fill="#10141a"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

function dynamis(w, h) {
  const sunX = w * 0.42, sunY = h * 0.47;
  const peaks = (base, amp, seed, fill) => { const r = rng(seed); let pts = `M0,${h} L0,${base * h}`; let x = 0; while (x < w) { const step = w * (0.16 + r() * 0.22); const top = (base - amp * (0.4 + r() * 0.6)) * h; pts += ` L${x + step / 2},${top} L${x + step},${base * h - r() * amp * h * 0.3}`; x += step; } return `<path d="${pts} L${w},${h} Z" fill="${fill}"/>`; };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1412"/><stop offset="0.3" stop-color="#5a3628"/><stop offset="0.48" stop-color="#d48a52"/><stop offset="0.56" stop-color="#f6c98c"/></linearGradient>
  <radialGradient id="sun" cx="${sunX}" cy="${sunY}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff0cf" stop-opacity="0.95"/><stop offset="0.12" stop-color="#f7b56f" stop-opacity="0.55"/><stop offset="0.5" stop-color="#c06a3a" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY + h * 0.02}" r="${Math.min(w, h) * 0.055}" fill="#fff3d9"/>
  ${peaks(0.6, 0.16, 131, '#a8664a')}
  <rect x="0" y="${h * 0.57}" width="${w}" height="${h * 0.05}" fill="#f4c48e" opacity="0.28" filter="url(#blur)"/>
  ${peaks(0.66, 0.1, 137, '#6e3f30')}
  <path d="${firs(w, h, 0.68, 29, h * 0.025, 40)}" fill="#55301f"/>
  ${peaks(0.74, 0.07, 139, '#3d2620')}
  <path d="${firs(w, h, 0.76, 31, h * 0.04, 26)}" fill="#2c1c17"/>
  <path d="${ridge(w, h, 0.84, 0.03, 141, 0.7)}" fill="#1e1512"/>
  <path d="${ridge(w, h, 0.93, 0.012, 143, 0.6)}" fill="#141110"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

function ktema(w, h) {
  const s = Math.min(w, h) / 380;
  const bx = w * 0.32, by = h * 0.74;
  const barn = `<g transform="translate(${bx},${by}) scale(${s})">
    <path d="M-40,0 L-40,-38 L0,-64 L40,-38 L40,0 Z" fill="#3a2e22"/>
    <path d="M-46,-36 L0,-68 L46,-36" stroke="#2a2119" stroke-width="6" fill="none"/>
    <rect x="-12" y="-30" width="24" height="30" fill="#211a14"/><path d="M-12,-30 L12,0 M12,-30 L-12,0" stroke="#4a3b2c" stroke-width="2"/>
    <rect x="-5" y="-52" width="10" height="9" fill="#f4cf7e"/>
    <circle cx="0" cy="-48" r="16" fill="#f4cf7e" opacity="0.14" filter="url(#soft)"/>
  </g>`;
  const fence = Array.from({ length: 22 }, (_, i) => { const x = w * (0.46 + i * 0.03); const y = h * (0.79 + i * 0.002); return `<rect x="${x}" y="${y - 14 * s}" width="${2.4 * s}" height="${16 * s}" fill="#2a261b"/>`; }).join('') + `<path d="M${w * 0.46},${h * 0.79 - 10 * s} L${w * 1.12},${h * 0.834 - 10 * s} M${w * 0.46},${h * 0.79 - 4 * s} L${w * 1.12},${h * 0.834 - 4 * s}" stroke="#2a261b" stroke-width="${1.6 * s}"/>`;
  const tree = `<g transform="translate(${w * 0.16},${h * 0.75}) scale(${s})"><path d="M-3,0 L-2,-40 L2,-40 L3,0 Z" fill="#26231a"/><ellipse cx="0" cy="-58" rx="30" ry="26" fill="#3c3a26"/><ellipse cx="-16" cy="-46" rx="18" ry="14" fill="#3c3a26"/><ellipse cx="16" cy="-48" rx="18" ry="15" fill="#34321f"/></g>`;
  const rows = Array.from({ length: 10 }, (_, i) => `<path d="M0,${h * (0.82 + i * 0.016)} Q${w * 0.5},${h * (0.8 + i * 0.016)} ${w},${h * (0.83 + i * 0.016)}" stroke="#4b4528" stroke-width="${Math.max(2, 2.4 * s)}" fill="none" opacity="0.6"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191a15"/><stop offset="0.3" stop-color="#4e4a33"/><stop offset="0.5" stop-color="#b9a26a"/><stop offset="0.62" stop-color="#f1dca4"/></linearGradient>
  <radialGradient id="sun" cx="${w * 0.72}" cy="${h * 0.6}" r="${w * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff4d4" stop-opacity="0.9"/><stop offset="0.14" stop-color="#f1d48f" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <circle cx="${w * 0.72}" cy="${h * 0.615}" r="${Math.min(w, h) * 0.045}" fill="#fff6dc"/>
  <path d="${ridge(w, h, 0.62, 0.025, 151, 1.1)}" fill="#8f8558" opacity="0.8"/>
  <rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.04}" fill="#f6e8bf" opacity="0.3" filter="url(#blur)"/>
  <path d="${ridge(w, h, 0.67, 0.025, 157, 1)}" fill="#6a6440"/>
  <path d="${firs(w, h, 0.675, 37, h * 0.02, 30)}" fill="#5a5536"/>
  <path d="${ridge(w, h, 0.74, 0.015, 161, 0.7)}" fill="#4d4a2e"/>
  ${tree}${barn}
  <path d="${ridge(w, h, 0.8, 0.012, 163, 0.6)}" fill="#3a3822"/>
  ${rows}${fence}
  <path d="${ridge(w, h, 0.93, 0.01, 167, 0.6)}" fill="#12130f"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </svg>`;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [name, draw] of Object.entries({ therapeia, dynamis, ktema })) {
  for (const [suffix, w, h] of [['', 852, 1846], ['-wide', 1672, 941]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${draw(w, h)}</body></html>`);
    await page.screenshot({ path: `${out}/${name}${suffix}.png` });
  }
}
await browser.close();
