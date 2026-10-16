import { LAMPLIGHT } from './lamplightPalette';
import type { Appearance } from '../data/storage/preferences';
import { footSvg, wallpaperSvg } from './wallpaper';
import { DEFAULT_ROOM, type ColorChoice, type LampColor, type Room } from '../core/look/lamplight';

export { ROOMS, LAMP_COLORS, DEFAULT_ROOM, type ColorChoice, type LampColor, type Room } from '../core/look/lamplight';

/** Lamplight: a room (the wallpaper and the tint of every surface) and a color (the lamp), each in dark and light.
 *  Values come from lamplightPalette.ts; this maps them onto the page's color tokens. */

export function colorFor(room: Room, color: ColorChoice): LampColor {
  return color === 'match' ? (LAMPLIGHT.rooms[room].accent as LampColor) : color;
}

const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(', ');

/** The swatch a color shows in Settings for this mode. */
export function swatchOf(color: LampColor, mode: 'dark' | 'light'): string {
  return LAMPLIGHT.accents[color][mode].lamp;
}

/** The room's drawn wallpaper, as a CSS image. */
export function wallpaperOf(room: Room, mode: 'dark' | 'light', wide = false): string {
  const tones = LAMPLIGHT.rooms[room][mode];
  return wallpaperSvg(tones.art, tones.tone1, mode === 'light', wide);
}

/** The foot of Today in the room's colors, as a CSS image. */
export function footOf(room: Room, mode: 'dark' | 'light', wide = false): string {
  const tones = LAMPLIGHT.rooms[room][mode];
  return footSvg(tones.art, tones.tone1, mode === 'light', wide);
}

/** The token values for a room and color. Text on every surface passes 4.5:1 (checked by the palette script). */
export function lamplightVars(room: Room, color: ColorChoice, mode: 'dark' | 'light'): Record<string, string> {
  const tones = LAMPLIGHT.rooms[room][mode];
  const lamp = LAMPLIGHT.accents[colorFor(room, color)][mode];
  const paper = rgb(tones.paper);
  const dark = mode === 'dark';
  return {
    '--color-ink': tones.tone1,
    '--color-ink-raised': tones.tone0,
    '--color-bg-rgb': rgb(tones.tone1),
    '--color-bar-rgb': rgb(dark ? tones.tone1 : tones.tone2),
    '--color-surface': tones.tone2,
    '--color-surface-raised': dark ? tones.tone3 : '#ffffff',
    '--color-surface-soft': `rgba(${paper}, ${dark ? 0.06 : 0.04})`,
    '--color-border': `rgba(${paper}, ${dark ? 0.13 : 0.16})`,
    '--color-text': tones.paper,
    '--color-text-muted': tones.paper2,
    '--color-text-faint': tones.paper3,
    '--hero-text': dark ? `rgba(${paper}, 0.84)` : tones.paper2,
    '--color-accent': lamp.lamp,
    // Light keeps the deeper lamp as the filled button with light words on it, as before.
    '--color-accent-strong': dark ? (lamp as { soft: string }).soft : lamp.lamp,
    '--color-accent-soft': `rgba(${rgb(lamp.lamp)}, ${dark ? 0.15 : 0.12})`,
    '--color-accent-ink': dark ? lamp.on : tones.tone2,
    '--color-accent-rgb': rgb(lamp.lamp),
    '--room-wall': wallpaperOf(room, mode),
    '--room-wall-wide': wallpaperOf(room, mode, true),
    '--room-foot': footOf(room, mode),
    '--room-foot-wide': footOf(room, mode, true),
  };
}

export const LAMPLIGHT_VARS = Object.keys(lamplightVars(DEFAULT_ROOM, 'match', 'dark'));

/** Sets the room and color on the page; returns the page color. */
export function applyLamplight(appearance: Appearance, light: boolean): string {
  const mode = light ? 'light' : 'dark';
  const root = document.documentElement;
  for (const [name, value] of Object.entries(lamplightVars(appearance.room, appearance.color, mode))) {
    root.style.setProperty(name, value);
  }
  root.dataset.room = appearance.room;
  return LAMPLIGHT.rooms[appearance.room][mode].tone1;
}
