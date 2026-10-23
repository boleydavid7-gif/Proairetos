import { contrast, oklch, type Hex } from './color';
import type { LampSeed, Mode, Scheme } from './scheme';

/*
 * Lamplight 2.0, day light (a preview, shown on the guide): the lamp follows the person's own day. Early in their day
 * it hangs high, cool and bright; late in it, low, warm and close; in the last hours before sleep it dims. The day is
 * the person's (from waking to sleep), not the clock, so a night worker's morning at 6 PM gets morning light. Only the
 * light changes: the lamp's place, warmth and pool, and a shade at the room's edges. Text and surfaces keep the
 * scheme's contrast, so nothing is ever harder to read late at night. Pure; no DOM.
 */

/** Where the person is in their waking day, 0 on waking to 1 at sleep; past sleep it stays at 1. */
export function dayPosition(now: Date, wake: string, sleep: string): number {
  const minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h % 24) * 60 + (m || 0);
  };
  const start = minutes(wake);
  let length = minutes(sleep) - start;
  if (length <= 0) length += 24 * 60;
  let since = now.getHours() * 60 + now.getMinutes() - start;
  if (since < 0) since += 24 * 60;
  return since >= length ? 1 : since / length;
}

export type DayLight = {
  /** The lamp's place on the page, as fractions of its width and height. */
  x: number;
  y: number;
  /** 0 the lamp's own color, 1 as warm as it goes. */
  warmth: number;
  /** How strong the lamp's pool is, 0 to 1. */
  pool: number;
  /** Shade gathering at the room's edges, 0 to 1. Never over text. */
  shade: number;
  /** A word for the stretch of the day, for the guide. */
  name: 'Waking' | 'Morning' | 'Midday' | 'Afternoon' | 'Evening' | 'Before sleep';
};

// The day's light at a few points; between them it eases.
const KEYS: { at: number; x: number; y: number; warmth: number; pool: number; shade: number }[] = [
  { at: 0, x: 0.7, y: 0.07, warmth: 0.2, pool: 0.85, shade: 0.04 },
  { at: 0.2, x: 0.64, y: 0.05, warmth: 0.05, pool: 1, shade: 0 },
  { at: 0.5, x: 0.58, y: 0.04, warmth: 0, pool: 1, shade: 0 },
  { at: 0.72, x: 0.55, y: 0.1, warmth: 0.45, pool: 0.9, shade: 0.06 },
  { at: 0.88, x: 0.52, y: 0.2, warmth: 0.85, pool: 0.72, shade: 0.14 },
  { at: 1, x: 0.5, y: 0.26, warmth: 1, pool: 0.55, shade: 0.2 },
];

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function nameAt(t: number): DayLight['name'] {
  if (t < 0.08) return 'Waking';
  if (t < 0.32) return 'Morning';
  if (t < 0.5) return 'Midday';
  if (t < 0.7) return 'Afternoon';
  if (t < 0.88) return 'Evening';
  return 'Before sleep';
}

/** The lamp at a point in the person's day (0 waking, 1 sleep). */
export function dayLight(position: number): DayLight {
  const t = Math.min(1, Math.max(0, position));
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].at) i += 1;
  const [a, b] = [KEYS[i], KEYS[i + 1]];
  const k = ease((t - a.at) / (b.at - a.at));
  return {
    x: mix(a.x, b.x, k),
    y: mix(a.y, b.y, k),
    warmth: mix(a.warmth, b.warmth, k),
    pool: mix(a.pool, b.pool, k),
    shade: mix(a.shade, b.shade, k),
    name: nameAt(t),
  };
}

/** Amber: where every lamp drifts as the day gets late. */
const WARM_HUE = 62;

/** The lamp warmed toward amber by `warmth`, keeping most of its own hue so an app's lamp stays its own. */
export function warmedLamp(lamp: LampSeed, warmth: number): LampSeed {
  const w = Math.min(1, Math.max(0, warmth));
  const turn = ((WARM_HUE - lamp.hue + 540) % 360) - 180;
  // A lamp with almost no color (Pewter) takes a little more of the warmth, or it would never change.
  const share = lamp.chroma < 0.04 ? 0.6 : 0.4;
  return { hue: (lamp.hue + turn * share * w + 360) % 360, chroma: lamp.chroma * (1 + 0.15 * w) + (lamp.chroma < 0.04 ? 0.05 * w : 0) };
}

/** The color of the lamp's pool on the page: a cool white early, the warmed lamp late, mixed straight between the two
 *  (turning the hue would pass through green on the way from blue to amber). */
export function poolColor(lamp: LampSeed, warmth: number, mode: Mode): Hex {
  const w = Math.min(1, Math.max(0, warmth));
  const L = mode === 'dark' ? 0.86 : 0.93;
  const warm = warmedLamp(lamp, warmth);
  return mixHex(oklch(L, 0.025, 235), oklch(L, warm.chroma * 0.9, warm.hue), w);
}

export function mixHex(a: Hex, b: Hex, t: number): Hex {
  const [x, y] = [a, b].map((hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)));
  return `#${x.map((value, index) => Math.round(value + (y[index] - value) * t).toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Vellum: a surface lit from the lamp's corner, brightest there and falling off across it. The lift at the pool's full
 * strength; the one lit thing on a page takes up to `LIT_STRENGTH` times it. `vellumReads` checks text at that worst case.
 */
export const VELLUM_LIFT = 0.1;
export const LIT_STRENGTH = 1.6;

/** The surface color at the lamp's corner of a vellum card: the card mixed with the pool. */
export function vellumPeak(surface: Hex, pool: Hex, strength: number): Hex {
  return mixHex(surface, pool, VELLUM_LIFT * Math.min(LIT_STRENGTH, Math.max(0, strength)));
}

/** Whether every text role still reads on a vellum card's brightest corner, at the scheme's own thresholds. */
export function vellumReads(s: Scheme, pool: Hex, strength: number): { ink: number; ink2: number; lamp: number; ok: boolean } {
  const peak = vellumPeak(s.card, pool, strength);
  const ink = contrast(s.ink, peak);
  const ink2 = contrast(s.ink2, peak);
  const lamp = contrast(s.lamp, peak);
  return { ink, ink2, lamp, ok: ink >= 7 && ink2 >= 4.5 && lamp >= 4.5 };
}

/**
 * Where the person is in their waking day, from their planned sleeps (Diaita's, around their schedule): from the end of
 * the last sleep to the start of the next. Inside a sleep it is 1 (the lamp stays low and warm for a phone opened at night).
 * Without a sleep on either side, undefined.
 */
export function positionFromSleeps(now: Date, sleeps: readonly { start: Date; end: Date }[]): number | undefined {
  const time = now.getTime();
  if (sleeps.some((sleep) => sleep.start.getTime() <= time && time < sleep.end.getTime())) return 1;
  const woke = sleeps.filter((sleep) => sleep.end.getTime() <= time).sort((a, b) => b.end.getTime() - a.end.getTime())[0];
  const next = sleeps.filter((sleep) => sleep.start.getTime() > time).sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (!woke || !next) return undefined;
  const length = next.start.getTime() - woke.end.getTime();
  return length > 0 ? Math.min(1, (time - woke.end.getTime()) / length) : undefined;
}

/** The most shade may darken (or, in light, tint) the page at the room's edges, at `shade` 1. */
export const SHADE_DARK = 1.6;
export const SHADE_LIGHT = 0.3;

/** Whether secondary text still reads on the page where the shade is deepest (light mode tints toward ink). */
export function shadeReads(s: Scheme, shade: number): boolean {
  if (s.mode === 'dark') return true; // Darker page, more contrast.
  const edge = mixHex(s.page, s.ink, SHADE_LIGHT * Math.min(1, Math.max(0, shade)));
  return contrast(s.ink2, edge) >= 4.5;
}
