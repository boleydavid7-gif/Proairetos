import { identityFor } from '../lamplight/identity';
import type { Appearance } from '../data/storage/preferences';
import { footSvg, wallpaperSvg, type WallLamp } from './wallpaper';
import { SHADE_DARK, SHADE_LIGHT, mixHex, poolColor, warmedLamp, type DayLight } from '../lamplight/daylight';
import { currentDayLight } from './dayLightState';
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
export function proairetosVars(s: Scheme, lamp?: WallLamp): Record<string, string> {
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
    '--room-wall': wallpaperSvg(s.art, s.page, !dark, false, lamp),
    '--room-wall-wide': wallpaperSvg(s.art, s.page, !dark, true, lamp),
    '--room-foot': footSvg(s.art, s.page, !dark),
    '--room-foot-wide': footSvg(s.art, s.page, !dark, true),
  };
}

/** The scheme for this page: Proairetos takes the person's room and color; every other app keeps its own theme,
 *  a room and a lamp drawn from what it is about (Phyton's greens, Hydros's water), made the same way. */
export function pageScheme(appearance: Appearance, mode: Mode, app: string, day?: DayLight): Scheme {
  const theme = app === 'proairetos' ? null : appTheme(app);
  if (theme) return makeScheme(theme.room, day ? warmedLamp(theme.lamp, day.warmth) : theme.lamp, mode);
  const lamp = lampSeed(appearance.room, appearance.color);
  return schemeOf(appearance.room, day ? warmedLamp(lamp, day.warmth) : lamp, mode);
}

/** Shade gathering at the top's edges, away from the lamp; it comes back to nothing before the bottom of its box, so
 *  the room never ends in a line. */
const shadeGradient = (day: DayLight, edge: string) =>
  `radial-gradient(120% 70% at ${(day.x * 100).toFixed(0)}% 0%, transparent 45%, ${edge} 80%, transparent 125%)`;

/** Day light's own pieces (Lamplight 2.0, Proairetos): the wallpaper's lamp and the shade at the room's edges. */
function dayPieces(appearance: Appearance, s: Scheme, day: DayLight): { lamp: WallLamp; shade: string } {
  const dark = s.mode === 'dark';
  const pool = poolColor(lampSeed(appearance.room, appearance.color), day.warmth, s.mode);
  const lamp = { x: day.x, y: day.y, strength: day.pool, glow: mixHex(s.art.glow, pool, 0.55), warmth: day.warmth };
  const edge = dark ? `rgba(0, 0, 0, ${(SHADE_DARK * day.shade).toFixed(3)})` : rgba(s.ink, SHADE_LIGHT * day.shade);
  const shade = `${shadeGradient(day, edge)} top / 100% var(--room-height) no-repeat`;
  return { lamp, shade };
}

/** Day light in the other apps: their pool of light at the top of the page moves, warms and dims with the day, and
 *  shade gathers at the top's edges (identity.css). Their pictures stay as drawn. */
function familyDayVars(app: string, s: Scheme, day: DayLight): Record<string, string> {
  const theme = appTheme(app);
  const pool = theme ? poolColor(theme.lamp, day.warmth, s.mode) : s.lamp;
  const dark = s.mode === 'dark';
  const edge = dark ? `rgba(0, 0, 0, ${(SHADE_DARK * day.shade).toFixed(3)})` : rgba(s.ink, SHADE_LIGHT * day.shade);
  return {
    '--ll-day-x': `${(day.x * 100 + 4).toFixed(1)}%`,
    '--ll-day-y': `${Math.round(-60 + (day.y - 0.09) * 800)}px`,
    '--ll-day-pool': day.pool.toFixed(3),
    '--ll-day-tint': `color-mix(in srgb, ${pool} ${Math.round(day.warmth * 60)}%, var(--ll-light-tint))`,
    '--ll-day-shade': shadeGradient(day, edge),
  };
}

const FAMILY_DAY_VARS = ['--ll-day-x', '--ll-day-y', '--ll-day-pool', '--ll-day-tint', '--ll-day-shade'];

/** Lays the room and color on the page; returns the page color for the browser bar. */
export function applyLamplight(appearance: Appearance, light: boolean, app = 'proairetos'): string {
  const mode: Mode = light && !ALWAYS_DARK.has(app) ? 'light' : 'dark';
  const day = appearance.dayLight ? currentDayLight() : undefined;
  const s = pageScheme(appearance, mode, app, day);
  const root = document.documentElement;
  const pieces = day && app === 'proairetos' ? dayPieces(appearance, s, day) : undefined;
  const vars = { ...schemeVars(s), ...(app === 'proairetos' ? proairetosVars(s, pieces?.lamp) : familyVars(s, app)) };
  if (app === 'proairetos') {
    if (pieces) root.style.setProperty('--room-shade', pieces.shade);
    else root.style.removeProperty('--room-shade');
  } else if (day) {
    Object.assign(vars, familyDayVars(app, s, day));
  } else {
    for (const name of FAMILY_DAY_VARS) root.style.removeProperty(name);
  }
  if (day) root.dataset.llDay = day.name;
  else delete root.dataset.llDay;
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.dataset.room = appearance.room;
  // The app's identity inside Lamplight: light, wall pattern, tempo, numerals, shape (lamplight/identity.ts).
  const identity = identityFor(app, mode);
  for (const [name, value] of Object.entries(identity.data)) root.dataset[name] = value;
  for (const [name, value] of Object.entries(identity.vars)) root.style.setProperty(name, value);
  if (isFamilyApp(app)) setBarMark(familyMarkSvg(app));
  return s.page;
}
