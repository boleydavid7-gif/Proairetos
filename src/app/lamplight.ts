import { identityFor } from '../lamplight/identity';
import type { Appearance } from '../data/storage/preferences';
import { footSvg, wallpaperSvg } from './wallpaper';
import { ownHue, type ColorChoice, type LampColor, type Room } from '../core/look/lamplight';
import { rgba, triple } from '../lamplight/color';
import { LAMP_SEEDS, ROOM_LAMP, ROOM_SEEDS, makeScheme, ownLamp, schemeVars, type LampSeed, type Mode, type Scheme } from '../lamplight/scheme';
import { appTheme } from '../lamplight/apps';
import { ALWAYS_DARK, familyVars } from '../lamplight/family';
import { setBarMark } from '../lamplight/behaviors';
import { familyMarkSvg, isFamilyApp } from './family/marks';

export { ROOMS, LAMP_COLORS, DEFAULT_ROOM, type ColorChoice, type LampColor, type Room } from '../core/look/lamplight';

/** Lamplight: a room (the wallpaper and the tint of every surface) and a color (the lamp), each in dark and light.
 *  The values are made from seeds by src/lamplight/scheme.ts; this lays them on the page. */

export function colorFor(room: Room, color: ColorChoice): LampColor | `hue:${number}` {
  return color === 'match' ? (ROOM_LAMP[room] as LampColor) : color;
}

export function lampSeed(room: Room, color: ColorChoice): LampSeed {
  const chosen = colorFor(room, color);
  const hue = ownHue(chosen);
  return hue === null ? LAMP_SEEDS[chosen as LampColor] : ownLamp(hue);
}

export const schemeOf = (room: Room, lamp: LampSeed, mode: Mode): Scheme => makeScheme(ROOM_SEEDS[room], lamp, mode);

/** The swatch a color shows in Settings for this mode. */
export function swatchOf(color: LampColor | `hue:${number}`, mode: Mode, room: Room = 'Hearth'): string {
  return schemeOf(room, lampSeed(room, color), mode).lampFill;
}

/** The room's drawn wallpaper, as a CSS image. */
export function wallpaperOf(room: Room, mode: Mode, wide = false): string {
  const s = schemeOf(room, LAMP_SEEDS.Amber, mode);
  return wallpaperSvg(s.art, s.page, mode === 'light', wide);
}

/** The foot of Today in the room's colors, as a CSS image. */
export function footOf(room: Room, mode: Mode, wide = false): string {
  const s = schemeOf(room, LAMP_SEEDS.Amber, mode);
  return footSvg(s.art, s.page, mode === 'light', wide);
}

/** Proairetos's own color names, from the scheme. Text on every surface passes (scheme.ts checks it). */
export function proairetosVars(s: Scheme): Record<string, string> {
  const dark = s.mode === 'dark';
  return {
    '--color-ink': s.page,
    '--color-ink-raised': s.wall,
    '--color-bg-rgb': triple(s.page),
    '--color-bar-rgb': triple(s.mica),
    '--color-surface': s.card,
    '--color-surface-raised': dark ? s.inset : '#ffffff',
    '--color-surface-soft': rgba(s.ink, dark ? 0.06 : 0.04),
    '--color-border': rgba(s.ink, dark ? 0.13 : 0.16),
    '--color-text': s.ink,
    '--color-text-muted': s.ink2,
    '--color-text-faint': s.ink3,
    '--hero-text': dark ? rgba(s.ink, 0.84) : s.ink2,
    '--color-accent': s.lamp,
    // Light keeps the deeper lamp as the filled button with light words on it, as before.
    '--color-accent-strong': dark ? s.lampSoft : s.lamp,
    '--color-accent-soft': rgba(s.lamp, dark ? 0.15 : 0.12),
    '--color-accent-ink': dark ? s.onLamp : s.card,
    '--color-accent-rgb': triple(s.lamp),
    '--room-wall': wallpaperSvg(s.art, s.page, !dark),
    '--room-wall-wide': wallpaperSvg(s.art, s.page, !dark, true),
    '--room-foot': footSvg(s.art, s.page, !dark),
    '--room-foot-wide': footSvg(s.art, s.page, !dark, true),
  };
}

/** The scheme for this page: Proairetos takes the person's room and color; every other app keeps its own theme,
 *  a room and a lamp drawn from what it is about (Phyton's greens, Hydros's water), made the same way. */
export function pageScheme(appearance: Appearance, mode: Mode, app: string): Scheme {
  const theme = app === 'proairetos' ? null : appTheme(app);
  if (theme) return makeScheme(theme.room, theme.lamp, mode);
  return schemeOf(appearance.room, lampSeed(appearance.room, appearance.color), mode);
}

/** Lays the room and color on the page; returns the page color for the browser bar. */
export function applyLamplight(appearance: Appearance, light: boolean, app = 'proairetos'): string {
  const mode: Mode = light && !ALWAYS_DARK.has(app) ? 'light' : 'dark';
  const s = pageScheme(appearance, mode, app);
  const root = document.documentElement;
  const vars = { ...schemeVars(s), ...(app === 'proairetos' ? proairetosVars(s) : familyVars(s, app)) };
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.dataset.room = appearance.room;
  // The app's identity inside Lamplight: light, wall pattern, tempo, numerals, shape (lamplight/identity.ts).
  const identity = identityFor(app, mode);
  for (const [name, value] of Object.entries(identity.data)) root.dataset[name] = value;
  for (const [name, value] of Object.entries(identity.vars)) root.style.setProperty(name, value);
  if (isFamilyApp(app)) setBarMark(familyMarkSvg(app));
  return s.page;
}
