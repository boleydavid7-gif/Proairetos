// Run: node scripts/scenes/<file>.mjs <out-dir>; then convert each PNG to webp (ffmpeg -i x.png -quality 85 x.webp).
// Needs Playwright with a Chromium (set CHROMIUM to its path).
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
import { landscape, rocks, branch, svg, sky, glow, ridgeFn, ridgePath, firsOn, mist, water, clouds, rng } from './engine.mjs';

const out = process.argv[2];
const only = process.argv[3];

// ---------- Proairetos ----------

// Dark Today: mountains at sunrise, warm orange over blue ridges, pines in front (lower half carries the picture).
const sunrise = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#141a2e'], [0.25, '#2f3352'], [0.42, '#8a5a52'], [0.52, '#e59a5a'], [0.58, '#f6c47a']],
    sun: [0.7, 0.55], sunR: 0.035, glowColor: '#ffcf86', glowSize: 0.5,
    clouds: [{ seed: 4, n: 5, y0: 0.2, y1: 0.4, color: '#f0a070', opacity: 0.3 }],
    ridges: [
      { base: 0.57, amp: 0.035, seed: 3, detail: 1.4, peaks: 4, color: '#8f6f86', light: '#ffd9a0' },
      { base: 0.62, amp: 0.03, seed: 8, detail: 1.1, color: '#5f4f72', mistBefore: ['#f2c08a', 0.25] },
      { base: 0.68, amp: 0.035, seed: 13, color: '#3d3a5a', firs: { size: 0.025, count: 70 } },
      { base: 0.76, amp: 0.035, seed: 21, color: '#262844', firs: { size: 0.045, count: 45 }, mistBefore: ['#c98a74', 0.2] },
      { base: 0.86, amp: 0.03, seed: 29, color: '#16182a', firs: { size: 0.075, count: 22 } },
    ],
  });

// Light Today and heroes: a bright morning, blue sky, gold sun, mist in a green valley, pines.
const morning = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#4f87c4'], [0.3, '#8fb9de'], [0.48, '#f2d9a8'], [0.56, '#fbe7bd']],
    sun: [0.72, 0.5], sunR: 0.03, glowColor: '#fff0c4', glowSize: 0.5, sunColor: '#fffaf0',
    clouds: [{ seed: 9, n: 8, y0: 0.08, y1: 0.36, color: '#ffffff', opacity: 0.75 }],
    ridges: [
      { base: 0.53, amp: 0.03, seed: 5, detail: 1.3, peaks: 3, color: '#a9bccd' },
      { base: 0.58, amp: 0.025, seed: 11, color: '#88a9a6', mistBefore: ['#ffffff', 0.55] },
      { base: 0.64, amp: 0.03, seed: 17, color: '#5f8a76', firs: { size: 0.025, count: 70 }, mistBefore: ['#ffffff', 0.45] },
      { base: 0.73, amp: 0.035, seed: 23, color: '#3f6d55', firs: { size: 0.05, count: 40 }, mistBefore: ['#fff8e6', 0.35] },
      { base: 0.85, amp: 0.03, seed: 31, color: '#24493a', firs: { size: 0.08, count: 24 } },
    ],
  });

// Oikonomia and others: a mountain valley at sunset, snowy peaks, warm light, deep green pines.
const valley = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#1d2340'], [0.22, '#4d3e5e'], [0.36, '#c46a4e'], [0.44, '#f2a65a']],
    sun: [0.62, 0.42], sunR: 0.03, glowColor: '#ffc27a', glowSize: 0.5,
    clouds: [{ seed: 12, n: 6, y0: 0.1, y1: 0.32, color: '#ff9f72', opacity: 0.4 }],
    ridges: [
      { base: 0.46, amp: 0.03, seed: 41, detail: 1.6, peaks: 6, color: '#a87c86', light: '#ffe0b0' },
      { base: 0.52, amp: 0.04, seed: 47, detail: 1.2, peaks: 2, color: '#6e5672', mistBefore: ['#f6b07a', 0.3] },
      { base: 0.6, amp: 0.035, seed: 53, color: '#41405e', firs: { size: 0.025, count: 60 } },
      { base: 0.7, amp: 0.04, seed: 59, color: '#283548', firs: { size: 0.045, count: 45 }, mistBefore: ['#e3967a', 0.22] },
      { base: 0.82, amp: 0.035, seed: 61, color: '#18222a', firs: { size: 0.08, count: 26 } },
    ],
  });

// Meditate, dark: a still lake between dark hills at dusk, a sliver of gold at the horizon.
const lake = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#07090f'], [0.25, '#141a28'], [0.4, '#3a3240'], [0.47, '#c27a4a'], [0.5, '#e8a85e']],
    sun: [0.66, 0.49], glowColor: '#f2a860', glowSize: 0.35, glowStrength: 0.7,
    stars: { seed: 2, density: 20000, maxY: 0.3 },
    ridges: [
      { base: 0.48, amp: 0.025, seed: 71, detail: 1.3, peaks: 3, color: '#4b3e4a' },
      { base: 0.52, amp: 0.02, seed: 73, color: '#2a2a36', firs: { size: 0.018, count: 50 },
        waterAfter: { y: 0.53, stops: [[0, '#a56a44'], [0.18, '#3a2e34'], [1, '#07090c']], glint: '#ffc98a', reflect: '#151620' } },
      { base: 0.84, amp: 0.025, seed: 79, color: '#0a0c10', firs: { size: 0.06, count: 18 } },
    ],
  });

// Meditate, light: a calm blue lake in the morning, mist on the water.
const lakeLight = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#5d93c8'], [0.3, '#a6c8e2'], [0.46, '#eadfc6']],
    sun: [0.3, 0.44], sunR: 0.028, glowColor: '#fff4d2', glowSize: 0.45, sunColor: '#fffbf2',
    clouds: [{ seed: 21, n: 7, y0: 0.06, y1: 0.3, color: '#ffffff', opacity: 0.8 }],
    ridges: [
      { base: 0.45, amp: 0.03, seed: 81, detail: 1.4, peaks: 3, color: '#a9bdd0' },
      { base: 0.5, amp: 0.025, seed: 83, color: '#6f9483', firs: { size: 0.02, count: 60 }, mistBefore: ['#ffffff', 0.5],
        waterAfter: { y: 0.52, stops: [[0, '#cfe0e8'], [0.3, '#86aec4'], [1, '#3f6f8a']], glint: '#ffffff', reflect: '#5b8073' } },
      { base: 0.86, amp: 0.025, seed: 89, color: '#2f4f43', firs: { size: 0.06, count: 18 } },
    ],
    after: (w, h) => mist(w, h * 0.52, h * 0.05, '#ffffff', 0.45),
  });

// The Journal: a dark, misty pine forest, almost night.
const forest = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#05070a'], [0.4, '#0c1214'], [0.6, '#29302c']],
    sun: [0.55, 0.62], glowColor: '#c8b28a', glowSize: 0.45, glowStrength: 0.35,
    ridges: [
      { base: 0.6, amp: 0.025, seed: 91, color: '#2a3330', firs: { size: 0.03, count: 70, color: '#2a3330' } },
      { base: 0.66, amp: 0.03, seed: 93, color: '#1c2523', firs: { size: 0.05, count: 50 }, mistBefore: ['#b8b4a0', 0.35] },
      { base: 0.75, amp: 0.035, seed: 97, color: '#121916', firs: { size: 0.08, count: 32 }, mistBefore: ['#8f8e80', 0.3] },
      { base: 0.87, amp: 0.03, seed: 99, color: '#080b0a', firs: { size: 0.12, count: 16 } },
    ],
  });

// ---------- HYDROS ----------

const hydrosLake = (w, h, glass) =>
  landscape(w, h, {
    sky: [[0, '#1a3a5c'], [0.22, '#4b6f93'], [0.36, '#e3a066'], [0.42, '#f6c47c']],
    sun: [0.62, 0.41], sunR: 0.03, glowColor: '#ffd08a', glowSize: 0.5,
    clouds: [{ seed: 31, n: 7, y0: 0.08, y1: 0.3, color: '#f7b98a', opacity: 0.55 }],
    ridges: [
      { base: 0.42, amp: 0.035, seed: 101, detail: 1.5, peaks: 4, color: '#7c7a96', light: '#ffe2b4' },
      { base: 0.46, amp: 0.025, seed: 103, color: '#3f5568', firs: { size: 0.018, count: 60 },
        waterAfter: { y: 0.47, stops: [[0, '#e9b57c'], [0.2, '#4f7590'], [1, '#0d2534']], glint: '#ffe0aa', reflect: '#2d4152' } },
    ],
    after: (w, h) => {
      let s = rocks(w, h, 5, 9, 0.8, Math.min(w, h) * 0.2, ['#2b2e30', '#3a3b3a', '#232628', '#45433e']);
      if (glass) {
        const gx = w * 0.42, gy = h * 0.66, gw = w * 0.15, gh = h * 0.13;
        s += `<path d="M${gx},${gy} L${gx + gw},${gy} L${gx + gw * 0.92},${gy + gh} L${gx + gw * 0.08},${gy + gh} Z" fill="#e8f6ff" fill-opacity="0.18" stroke="#f4fbff" stroke-opacity="0.8" stroke-width="${w * 0.004}"/>`;
        s += `<path d="M${gx + gw * 0.035},${gy + gh * 0.32} L${gx + gw * 0.965},${gy + gh * 0.32} L${gx + gw * 0.92},${gy + gh} L${gx + gw * 0.08},${gy + gh} Z" fill="#7cc8e6" fill-opacity="0.45"/>`;
        s += `<path d="M${gx + gw * 0.18},${gy + gh * 0.1} L${gx + gw * 0.22},${gy + gh * 0.9}" stroke="#fff" stroke-opacity="0.55" stroke-width="${w * 0.006}" stroke-linecap="round"/>`;
        s += `<ellipse cx="${gx + gw / 2}" cy="${gy + gh + h * 0.004}" rx="${gw * 0.55}" ry="${h * 0.006}" fill="#000" opacity="0.3"/>`;
      }
      return s;
    },
  });

// ---------- SOMA ----------

const produce = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#6f9ac2'], [0.25, '#b9cfe0'], [0.42, '#f3d8a8']],
    sun: [0.7, 0.4], sunR: 0.03, glowColor: '#fff0c8', glowSize: 0.45, sunColor: '#fffaf0',
    clouds: [{ seed: 41, n: 6, y0: 0.06, y1: 0.28, color: '#ffffff', opacity: 0.75 }],
    ridges: [
      { base: 0.4, amp: 0.035, seed: 111, detail: 1.4, peaks: 4, color: '#a4b1c2' },
      { base: 0.46, amp: 0.025, seed: 113, color: '#6f927e', firs: { size: 0.025, count: 50 },
        waterAfter: { y: 0.48, stops: [[0, '#d9e6ea'], [0.4, '#8db2c4'], [1, '#4e7e94']], glint: '#ffffff', reflect: '#5d826f' } },
    ],
    after: (w, h) => {
      const m = Math.min(w, h);
      let s = `<rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#7a5a3e"/><rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.012}" fill="#9a7550"/>`;
      for (let i = 1; i < 6; i++) s += `<rect x="0" y="${h * (0.72 + i * 0.05)}" width="${w}" height="${h * 0.003}" fill="#5e4430" opacity="0.6"/>`;
      // A bowl of tomatoes and greens, a potted herb, and leaves at the edge.
      const bx = w * 0.38, by = h * 0.8;
      for (const [dx, dy, c] of [[-0.09, -0.03, '#d2412f'], [-0.03, -0.045, '#e0533a'], [0.04, -0.035, '#c93a2a'], [0.09, -0.02, '#e86b3c'], [0, -0.012, '#5d8f3e'], [-0.06, -0.005, '#4f7f35']]) s += `<circle cx="${bx + dx * w}" cy="${by + dy * h}" r="${m * 0.05}" fill="${c}"/>`;
      s += `<path d="M${bx - w * 0.17},${by - h * 0.01} L${bx + w * 0.17},${by - h * 0.01} Q${bx + w * 0.14},${by + h * 0.07} ${bx},${by + h * 0.075} Q${bx - w * 0.14},${by + h * 0.07} ${bx - w * 0.17},${by - h * 0.01} Z" fill="#3a3734"/>`;
      const px = w * 0.8, py = h * 0.82;
      s += `<path d="M${px - w * 0.08},${py - h * 0.05} L${px + w * 0.08},${py - h * 0.05} L${px + w * 0.065},${py + h * 0.05} L${px - w * 0.065},${py + h * 0.05} Z" fill="#b8693e"/>`;
      s += branch(px, py - h * 0.05, m * 0.35, -100, 3, m * 0.09, ['#4f8a3c', '#3f7a32', '#62a04a'], '#3c5a2c');
      s += branch(px, py - h * 0.05, m * 0.3, -60, 4, m * 0.08, ['#4f8a3c', '#62a04a'], '#3c5a2c');
      s += branch(px, py - h * 0.05, m * 0.3, -130, 5, m * 0.08, ['#3f7a32', '#62a04a'], '#3c5a2c');
      s += branch(0, h * 0.05, m * 0.6, 50, 6, m * 0.11, ['#3f6e33', '#517f3c', '#2f5a2a'], '#3c4a2c');
      s += branch(0, h * 0.35, m * 0.45, 10, 7, m * 0.1, ['#3f6e33', '#517f3c'], '#3c4a2c');
      return s;
    },
  });

const oliveWall = (w, h) => {
  const m = Math.min(w, h);
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  const far = ridgeFn(w, h, 0.42, 0.03, 121, 1.2, 2);
  const near = ridgeFn(w, h, 0.5, 0.03, 123, 1);
  body += `<path d="${ridgePath(w, h, far)}" fill="#9aa9a6"/><path d="${ridgePath(w, h, near)}" fill="#6f8f6c"/><path d="${firsOn(w, near, 9, h * 0.04, 10)}" fill="#55764f"/>`;
  body += `<rect x="${w * 0.4}" y="0" width="${w * 0.6}" height="${h}" fill="#e7dcc6"/><rect x="${w * 0.4}" y="0" width="${w * 0.03}" height="${h}" fill="#cfc2a8"/>`;
  body += `<rect x="0" y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="#d9ccb2"/><rect x="0" y="${h * 0.82}" width="${w}" height="${h * 0.01}" fill="#c4b597"/>`;
  // Pot with an olive sapling, and a bowl of lemons.
  const px = w * 0.72, py = h * 0.82;
  body += `<path d="M${px - w * 0.12},${py - h * 0.12} L${px + w * 0.12},${py - h * 0.12} L${px + w * 0.09},${py} L${px - w * 0.09},${py} Z" fill="#efe7d6" stroke="#cbbd9f" stroke-width="2"/>`;
  body += branch(px, py - h * 0.12, m * 0.9, -95, 11, m * 0.15, ['#7d8f58', '#93a36a', '#6a7d4a'], '#6b5a44');
  body += branch(px, py - h * 0.2, m * 0.6, -60, 12, m * 0.13, ['#7d8f58', '#93a36a'], '#6b5a44');
  const bx = w * 0.32, by = py;
  for (const dx of [-0.1, 0, 0.1, -0.05, 0.05]) body += `<circle cx="${bx + dx * w}" cy="${by - h * (dx === -0.05 || dx === 0.05 ? 0.045 : 0.025)}" r="${m * 0.07}" fill="#f2c94a"/>`;
  body += `<path d="M${bx - w * 0.2},${by - h * 0.02} L${bx + w * 0.2},${by - h * 0.02} Q${bx + w * 0.16},${by + h * 0.03} ${bx},${by + h * 0.035} Q${bx - w * 0.16},${by + h * 0.03} ${bx - w * 0.2},${by - h * 0.02} Z" fill="#8a7a62"/>`;
  body += branch(0, 0, m * 1.4, 35, 13, m * 0.17, ['#6f8150', '#82955e', '#5c6d43'], '#5a4a36');
  return svg(w, h, sky('sky', [[0, '#9fc0d8'], [0.4, '#e8e0c8']]), body);
};

const sunsetValley = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#5d7aa4'], [0.2, '#c9a89a'], [0.36, '#f3c07e']],
    sun: [0.62, 0.36], sunR: 0.035, glowColor: '#ffd890', glowSize: 0.55,
    clouds: [{ seed: 51, n: 5, y0: 0.06, y1: 0.24, color: '#fff2dc', opacity: 0.7 }],
    ridges: [
      { base: 0.4, amp: 0.03, seed: 131, detail: 1.3, peaks: 2, color: '#a99aa6' },
      { base: 0.47, amp: 0.03, seed: 133, color: '#7e8f80', mistBefore: ['#fff0d0', 0.4] },
      { base: 0.56, amp: 0.035, seed: 137, color: '#56735a', firs: { size: 0.04, count: 30 } },
      { base: 0.66, amp: 0.035, seed: 139, color: '#3c5a40', firs: { size: 0.07, count: 16 } },
    ],
    after: (w, h) => {
      const m = Math.min(w, h);
      let s = `<rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#8c6a48"/><rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.012}" fill="#a98159"/>`;
      for (let i = 1; i < 5; i++) s += `<rect x="0" y="${h * (0.78 + i * 0.045)}" width="${w}" height="${h * 0.003}" fill="#6e5236" opacity="0.6"/>`;
      s += `<path d="M${w * 0.05},${h * 0.8} Q${w * 0.2},${h * 0.79} ${w * 0.4},${h * 0.82} L${w * 0.36},${h * 0.9} Q${w * 0.18},${h * 0.88} ${w * 0.02},${h * 0.9} Z" fill="#efe6d4" opacity="0.9"/>`;
      s += branch(0, 0, m * 1.1, 30, 17, m * 0.15, ['#6f8150', '#82955e', '#5c6d43'], '#5a4a36');
      s += branch(w * 0.15, 0, m * 0.8, 60, 18, m * 0.13, ['#6f8150', '#82955e'], '#5a4a36');
      return s;
    },
  });

// ---------- Askesis ----------

const sunsetLake = (w, h) =>
  landscape(w, h, {
    sky: [[0, '#2b3558'], [0.25, '#7a5a6e'], [0.42, '#e8925a'], [0.5, '#f8c070']],
    sun: [0.82, 0.47], sunR: 0.04, glowColor: '#ffd088', glowSize: 0.6,
    clouds: [{ seed: 61, n: 6, y0: 0.08, y1: 0.3, color: '#f7a87a', opacity: 0.45 }],
    ridges: [
      { base: 0.48, amp: 0.035, seed: 141, detail: 1.4, peaks: 4, color: '#8a6f84', light: '#ffdcaa' },
      { base: 0.52, amp: 0.025, seed: 143, color: '#4d4a64', firs: { size: 0.025, count: 50 },
        waterAfter: { y: 0.54, stops: [[0, '#f0b070'], [0.25, '#7d5e6c'], [1, '#22223a']], glint: '#ffe0a0', reflect: '#3a3850' } },
    ],
    after: (w, h) => {
      // A grassy bank on the left with a winding path and tall pines.
      const bank = `M0,${h * 0.5} C${w * 0.15},${h * 0.52} ${w * 0.3},${h * 0.62} ${w * 0.42},${h * 0.78} C${w * 0.5},${h * 0.9} ${w * 0.55},${h} ${w * 0.6},${h} L0,${h} Z`;
      let s = `<path d="${bank}" fill="#2f3a2c"/>`;
      s += `<path d="M${w * 0.02},${h * 0.62} C${w * 0.12},${h * 0.66} ${w * 0.2},${h * 0.72} ${w * 0.24},${h * 0.8} C${w * 0.28},${h * 0.88} ${w * 0.22},${h * 0.95} ${w * 0.16},${h}" stroke="#c9a77a" stroke-width="${h * 0.035}" fill="none" stroke-linecap="round" opacity="0.85"/>`;
      const f = (x) => h * (0.5 + 0.28 * Math.min(1, x / (w * 0.42)) ** 1.6);
      s += `<path d="${firsOn(w * 0.4, f, 7, h * 0.12, 12, 0.05)}" fill="#1c2620"/>`;
      s += `<path d="${firsOn(w * 0.18, (x) => h * 0.56, 8, h * 0.22, 4, 0)}" fill="#141c18"/>`;
      return s;
    },
  });

const scenes = {
  'sunrise': [[852, 1513], sunrise], 'sunrise-wide': [[1672, 941], sunrise],
  'morning': [[852, 1846], morning], 'morning-wide': [[1672, 941], morning],
  'valley': [[852, 1846], valley], 'valley-wide': [[1672, 941], valley],
  'lake': [[852, 1846], lake], 'lake-wide': [[1672, 941], lake],
  'lake-light': [[852, 1846], lakeLight], 'lake-light-wide': [[1672, 941], lakeLight],
  'forest': [[852, 1846], forest], 'forest-wide': [[1672, 941], forest],
  'hydros-sunset': [[941, 1672], (w, h) => hydrosLake(w, h, false)], 'hydros-add': [[941, 1672], (w, h) => hydrosLake(w, h, true)],
  'lake-produce': [[1100, 1422], produce], 'olive-wall': [[580, 1008], oliveWall], 'sunset-valley': [[724, 1008], sunsetValley],
  'sunset-lake': [[1600, 900], sunsetLake],
};

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [name, [[w, h], draw]] of Object.entries(scenes)) {
  if (only && !name.startsWith(only)) continue;
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${draw(w, h)}</body></html>`);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
