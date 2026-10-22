import type { Place } from './model';

/*
 * A trip's picture, drawn from its place in the family's flat scene style (scripts/scenes/engine.mjs): sky, the one
 * light at LAMP_X with its faint ring, layered ridges, and what the place is like: water low by the sea or a river,
 * peaks up high, snow far north or very high, a skyline for a big city, palms in the tropics. The time of day at the
 * place sets the light. Everything is seeded by the place's name, so a place always looks the same.
 */

export type SceneKind = 'coast' | 'tropics' | 'hills' | 'mountains' | 'snow' | 'city';
export type SceneTime = 'dawn' | 'day' | 'dusk' | 'night';

const LAMP_X = 0.64;

/** What kind of picture a place gets, from what the place search knows about it. */
export function sceneKindFor(place: Pick<Place, 'lat' | 'elevation' | 'population'>): SceneKind {
  const lat = Math.abs(place.lat ?? 40);
  const up = place.elevation;
  if ((up !== undefined && up > 1800) || lat > 62) return 'snow';
  if (up !== undefined && up > 650) return 'mountains';
  if ((place.population ?? 0) >= 1_000_000) return 'city';
  if (up !== undefined && up <= 60) return lat < 23.5 ? 'tropics' : 'coast';
  return 'hills';
}

export function sceneTimeAt(hour: number): SceneTime {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** The hour now at a place, from its time zone (the device's when it has none). */
export function hourAt(timezone: string | undefined, now = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(now);
    return Number(hour) % 24;
  } catch {
    return now.getHours();
  }
}

type Palette = { sky: string[]; light: string; glow: string; ridges: string[]; water: string[]; glint: string; window: string; stars: boolean };

const PALETTES: Record<SceneTime, Palette> = {
  dawn: { sky: ['#2d3a5c', '#a86f78', '#f0bf8e'], light: '#ffe6bd', glow: '#ffc58a', ridges: ['#8a6e80', '#5e5068', '#3d3650', '#27243a'], water: ['#9c7884', '#3b3550'], glint: '#ffd9a8', window: '#ffd89a', stars: false },
  day: { sky: ['#4c93bd', '#94c7de', '#e6f1ee'], light: '#fff8e0', glow: '#fff1c2', ridges: ['#9dbcc0', '#6f989e', '#46737a', '#2b5258'], water: ['#5795ad', '#2c5f72'], glint: '#ffffff', window: '#e9f3f1', stars: false },
  dusk: { sky: ['#1c2747', '#6e4a6c', '#e0956a'], light: '#ffd7a0', glow: '#ffb27a', ridges: ['#6f5675', '#4a3d5c', '#302a45', '#1d1a2e'], water: ['#6d4f6c', '#241f38'], glint: '#ffc98f', window: '#ffd28a', stars: false },
  night: { sky: ['#050d1a', '#0c1f31', '#1b3a4a'], light: '#eef3f8', glow: '#9cc3d6', ridges: ['#1f3646', '#152a39', '#0e1f2b', '#08141d'], water: ['#10283a', '#06121c'], glint: '#cfe3ee', window: '#ffd58a', stars: true },
};

function seedOf(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function ridgeFn(w: number, h: number, base: number, amp: number, seed: number, detail = 1, peaks = 0) {
  const r = rng(seed);
  const waves = Array.from({ length: 5 }, (_, i) => ({ f: (0.6 + r() * 1.4) * (i + 1) * detail, p: r() * Math.PI * 2, a: amp / (i + 1.3) }));
  const spikes = Array.from({ length: peaks }, () => ({ x: r(), a: amp * (1 + r() * 1.4), s: 0.07 + r() * 0.08 }));
  return (x: number) => {
    let y = base;
    for (const v of waves) y += Math.sin((x / w) * Math.PI * 2 * v.f + v.p) * v.a;
    for (const spike of spikes) {
      const d = Math.abs(x / w - spike.x) / spike.s;
      if (d < 1) y -= (spike.a * (Math.cos(Math.PI * d) + 1)) / 2;
    }
    return y * h;
  };
}

function ridgePath(w: number, h: number, f: (x: number) => number, steps = 80): string {
  const points: string[] = [];
  for (let step = 0; step <= steps; step++) {
    const x = (w * step) / steps;
    points.push(`${x.toFixed(1)},${f(x).toFixed(1)}`);
  }
  return `M0,${h} L${points.join(' L')} L${w},${h} Z`;
}

function firs(w: number, f: (x: number) => number, seed: number, size: number, count: number): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const s = size * (0.55 + r() * 0.9);
    const y = f(x) + s * 0.15;
    const t = s * 1.6;
    d += `M${(x - s * 0.34).toFixed(1)},${y.toFixed(1)} L${(x - s * 0.12).toFixed(1)},${(y - t * 0.45).toFixed(1)} L${(x - s * 0.24).toFixed(1)},${(y - t * 0.45).toFixed(1)} L${x.toFixed(1)},${(y - t).toFixed(1)} L${(x + s * 0.24).toFixed(1)},${(y - t * 0.45).toFixed(1)} L${(x + s * 0.12).toFixed(1)},${(y - t * 0.45).toFixed(1)} L${(x + s * 0.34).toFixed(1)},${y.toFixed(1)} Z `;
  }
  return d;
}

function skyline(w: number, h: number, seed: number, top: number, color: string, window: string, lit: boolean): string {
  const r = rng(seed);
  let body = '';
  let x = -w * 0.02;
  while (x < w) {
    const bw = w * (0.03 + r() * 0.045);
    const bh = h * (0.05 + r() * 0.13) * (Math.abs(x / w - LAMP_X) < 0.18 ? 0.6 : 1) * (r() < 0.12 ? 1.8 : 1);
    const y = h * top - bh;
    body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(h - y).toFixed(1)}" fill="${color}"/>`;
    if (r() < 0.25) body += `<rect x="${(x + bw * 0.45).toFixed(1)}" y="${(y - h * 0.04).toFixed(1)}" width="${(bw * 0.1).toFixed(1)}" height="${(h * 0.04).toFixed(1)}" fill="${color}"/>`;
    if (lit) {
      for (let wy = y + h * 0.02; wy < h * 0.97; wy += h * 0.035) {
        for (let wx = x + bw * 0.18; wx < x + bw * 0.82; wx += bw * 0.26) {
          if (r() < 0.32) body += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${(bw * 0.1).toFixed(1)}" height="${(h * 0.012).toFixed(1)}" fill="${window}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`;
        }
      }
    }
    x += bw + w * (r() < 0.2 ? 0.02 : 0.004);
  }
  return body;
}

function palm(x: number, ground: number, size: number, color: string, lean: number): string {
  const top = { x: x + lean * size * 0.5, y: ground - size };
  let s = `<path d="M${x},${ground} Q${x + lean * size * 0.1},${ground - size * 0.55} ${top.x},${top.y}" stroke="${color}" stroke-width="${(size * 0.05).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  for (const angle of [-160, -125, -95, -60, -25, 10]) {
    const rad = (angle * Math.PI) / 180;
    const ex = top.x + Math.cos(rad) * size * 0.42;
    const ey = top.y + Math.sin(rad) * size * 0.42 + size * 0.12;
    const mx = top.x + Math.cos(rad) * size * 0.22;
    const my = top.y + Math.sin(rad) * size * 0.22 - size * 0.06;
    s += `<path d="M${top.x.toFixed(1)},${top.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" stroke="${color}" stroke-width="${(size * 0.045).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

/**
 * The picture as SVG text. `id` keeps its gradients apart from another picture on the same page; `small` leaves out
 * the details a list's thumbnail would not show.
 */
export function sceneSvg(o: { kind: SceneKind; time: SceneTime; seed: string; id: string; w?: number; h?: number; small?: boolean }): string {
  const w = o.w ?? 1200;
  const h = o.h ?? 520;
  const m = Math.min(w, h);
  const p = PALETTES[o.time];
  const seed = seedOf(o.seed);
  const r = rng(seed);
  const id = o.id.replace(/[^\w-]/g, '');
  const sunX = w * LAMP_X;
  const horizon = o.kind === 'coast' || o.kind === 'tropics' ? 0.66 : o.kind === 'city' ? 0.62 : 0.6;
  const sunY = h * (o.time === 'day' ? 0.4 : o.time === 'night' ? 0.36 : horizon - 0.12);
  const defs = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">${p.sky.map((color, i) => `<stop offset="${i / (p.sky.length - 1)}" stop-color="${color}"/>`).join('')}</linearGradient><radialGradient id="${id}g" cx="${sunX}" cy="${sunY}" r="${Math.max(w, h) * 0.5}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.glow}" stop-opacity="0.85"/><stop offset="0.16" stop-color="${p.glow}" stop-opacity="0.4"/><stop offset="0.55" stop-color="${p.glow}" stop-opacity="0.08"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water[0]}"/><stop offset="1" stop-color="${p.water[1]}"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#${id}s)"/>`;
  if (p.stars && !o.small) {
    for (let i = 0; i < 60; i++) body += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h * 0.5).toFixed(1)}" r="${(0.6 + r() * 1.3).toFixed(2)}" fill="#fff" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`;
  }
  body += `<rect width="${w}" height="${h}" fill="url(#${id}g)"/>`;
  body += `<circle cx="${sunX}" cy="${sunY}" r="${(m * 0.075).toFixed(1)}" fill="${p.light}"/>`;
  if (!o.small) body += `<circle cx="${sunX}" cy="${sunY}" r="${(m * 0.15).toFixed(1)}" fill="none" stroke="${p.glow}" stroke-opacity="0.25" stroke-width="${Math.max(1.5, m * 0.005).toFixed(1)}"/>`;

  const [far, mid, near, front] = p.ridges;
  const layers: { base: number; amp: number; color: string; peaks?: number; firs?: boolean; snow?: boolean }[] =
    o.kind === 'mountains'
      ? [
          { base: 0.52, amp: 0.09, color: far, peaks: 4 },
          { base: 0.62, amp: 0.07, color: mid, peaks: 3 },
          { base: 0.74, amp: 0.035, color: near, firs: true },
          { base: 0.88, amp: 0.02, color: front, firs: true },
        ]
      : o.kind === 'snow'
        ? [
            { base: 0.52, amp: 0.09, color: far, peaks: 4, snow: true },
            { base: 0.64, amp: 0.06, color: mid, peaks: 3, snow: true },
            { base: 0.78, amp: 0.03, color: near, firs: true },
            { base: 0.9, amp: 0.015, color: front },
          ]
        : o.kind === 'hills'
          ? [
              { base: 0.58, amp: 0.035, color: far },
              { base: 0.68, amp: 0.035, color: mid },
              { base: 0.8, amp: 0.03, color: near, firs: true },
              { base: 0.92, amp: 0.02, color: front },
            ]
          : o.kind === 'city'
            ? [
                { base: 0.56, amp: 0.025, color: far },
                { base: 0.62, amp: 0.02, color: mid },
              ]
            : [
                { base: 0.58, amp: 0.03, color: far },
                { base: 0.63, amp: 0.025, color: mid },
              ];
  const snowColor = o.time === 'night' ? '#9fb6c4' : o.time === 'day' ? '#f4f8fa' : '#e9d6d6';
  layers.forEach((layer, index) => {
    const f = ridgeFn(w, h, layer.base, layer.amp, seed + index * 7, 1, layer.peaks ?? 0);
    const path = ridgePath(w, h, f, o.small ? 40 : 80);
    body += `<path d="${path}" fill="${layer.color}"/>`;
    if (layer.snow) {
      // The snow line wavers a little, so the caps end the way snow does rather than along a ruler.
      const line = ridgeFn(w, h, layer.base - layer.amp * 0.9, layer.amp * 0.25, seed + index * 31, 3);
      const cap = `M0,0 L${w},0 ${Array.from({ length: 41 }, (_, step) => `L${((w * (40 - step)) / 40).toFixed(1)},${line((w * (40 - step)) / 40).toFixed(1)}`).join(' ')} Z`;
      body += `<clipPath id="${id}c${index}"><path d="${path}"/></clipPath><path d="${cap}" fill="${snowColor}" opacity="0.88" clip-path="url(#${id}c${index})"/>`;
    }
    if (layer.firs && !o.small) body += `<path d="${firs(w, f, seed + index * 13, h * 0.045, 26)}" fill="${layer.color}"/>`;
  });

  if (o.kind === 'coast' || o.kind === 'tropics' || o.kind === 'city') {
    const wy = h * horizon;
    body += `<rect x="0" y="${wy}" width="${w}" height="${h - wy}" fill="url(#${id}w)"/>`;
    body += `<rect x="${(sunX - w * 0.035).toFixed(1)}" y="${wy}" width="${(w * 0.07).toFixed(1)}" height="${((h - wy) * 0.7).toFixed(1)}" fill="${p.glint}" opacity="0.18"/>`;
    for (let i = 0; i < (o.small ? 4 : 12); i++) {
      const ly = wy + (h - wy) * (0.04 + i * 0.075);
      const lw = w * (0.03 + i * 0.012) * (0.7 + r() * 0.6);
      body += `<rect x="${(sunX - lw / 2).toFixed(1)}" y="${ly.toFixed(1)}" width="${lw.toFixed(1)}" height="${Math.max(1.5, h * 0.004).toFixed(1)}" rx="1" fill="${p.glint}" opacity="${Math.max(0.1, 0.55 - i * 0.04).toFixed(2)}"/>`;
    }
  }
  if (o.kind === 'city') body += skyline(w, h, seed, horizon + 0.005, near, p.window, o.time !== 'day');
  if (o.kind === 'coast') {
    // A low headland at the left, and the near shore.
    const shore = ridgeFn(w, h, 0.93, 0.02, seed + 41);
    body += `<path d="${ridgePath(w, h, shore, 40)}" fill="${front}"/>`;
    const head = (x: number) => h * (horizon - 0.02) + (x / w) ** 0.6 * h * 0.3;
    body += `<path d="M0,${h} L0,${(h * (horizon - 0.08)).toFixed(1)} Q${(w * 0.12).toFixed(1)},${(h * (horizon - 0.1)).toFixed(1)} ${(w * 0.24).toFixed(1)},${head(w * 0.24).toFixed(1)} L${(w * 0.3).toFixed(1)},${h} Z" fill="${near}"/>`;
  }
  if (o.kind === 'tropics') {
    const shore = ridgeFn(w, h, 0.92, 0.015, seed + 41);
    body += `<path d="${ridgePath(w, h, shore, 40)}" fill="${front}"/>`;
    body += palm(w * 0.1, h * 0.94, h * 0.62, front, 0.35);
    if (!o.small) body += palm(w * 0.2, h * 0.95, h * 0.44, front, 0.6);
    body += palm(w * 0.9, h * 0.94, h * 0.5, front, -0.4);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
}
