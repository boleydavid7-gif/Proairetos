import { toOklch } from './color';
import type { LampSeed, RoomSeed } from './scheme';

/*
 * Each app's own theme, from what it is about: its page colors (a room) and its accent (a lamp), taken from the
 * colors it has always had. The scheme makes every role from them, so each app keeps its look and gains Lamplight's
 * structure and contrast. Proairetos alone takes the person's room and color.
 */
const APP_COLORS: Record<string, { dark: string; light: string; lamp: string }> = {
  askesis: { dark: '#0b0f0e', light: '#f3f4ef', lamp: '#86d9b0' },
  soma: { dark: '#111814', light: '#f3ede2', lamp: '#9cc7a6' },
  oikonomia: { dark: '#0d1110', light: '#f2eee6', lamp: '#d79572' },
  hydros: { dark: '#061219', light: '#eaf4f5', lamp: '#36c9f4' },
  praxis: { dark: '#0b201a', light: '#0b201a', lamp: '#c9a274' },
  theoria: { dark: '#0b1020', light: '#0b1020', lamp: '#d9b46a' },
  diaita: { dark: '#0e1014', light: '#f1eee8', lamp: '#e2b26e' },
  philia: { dark: '#120f10', light: '#f6efea', lamp: '#e39a8f' },
  ergon: { dark: '#0e1112', light: '#eff1ed', lamp: '#8fc1b5' },
  therapeia: { dark: '#10141a', light: '#eef1f5', lamp: '#9cb8e0' },
  dynamis: { dark: '#141110', light: '#f3efea', lamp: '#e0a36b' },
  ktema: { dark: '#12130f', light: '#f1efe8', lamp: '#c7b37a' },
  phyton: { dark: '#0f1410', light: '#eef2ea', lamp: '#9fc48a' },
};

export function appTheme(app: string): { room: RoomSeed; lamp: LampSeed } | null {
  const colors = APP_COLORS[app];
  if (!colors) return null;
  const dark = toOklch(colors.dark);
  const light = toOklch(colors.light);
  const lamp = toOklch(colors.lamp);
  const lampHue = Math.round(lamp.h);
  return {
    room: {
      hue: Math.round(dark.h),
      lightHue: Math.round(light.h),
      chroma: { dark: Math.min(dark.C, 0.035), light: Math.min(light.C, 0.025) },
      glows: [[lampHue, 0.1], [lampHue, 0.06], [Math.round(dark.h), 0.04]],
    },
    lamp: { hue: lampHue, chroma: Math.min(Math.max(lamp.C, 0.06), 0.14) },
  };
}

export const THEMED_APPS = Object.keys(APP_COLORS);
