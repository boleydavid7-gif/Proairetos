import { rgba, triple } from './color';
import type { Scheme } from './scheme';

/*
 * The bridge: each app's own color names, set from the scheme, so every screen the apps already have wears
 * Lamplight (the person's room on every surface, the app's own lamp) without rewriting its rules. Set inline on
 * the root by applyLamplight, so they win over the colors in each app's stylesheet.
 */

/** Askesis's names, shared by Soma, Oikonomia and the newer apps (askesis.css). */
function shellVars(s: Scheme): Record<string, string> {
  const dark = s.mode === 'dark';
  return {
    '--bg': s.page,
    '--surface': s.card,
    '--surface-2': s.inset,
    '--line': rgba(s.ink, dark ? 0.12 : 0.13),
    '--text': s.ink,
    '--text-soft': s.ink2,
    '--muted': s.ink3,
    // The app's lamp: in dark one bright color for the pill and for text; in light the deeper one, with light words on it.
    '--mint': s.lamp,
    '--mint-ink': dark ? s.onLamp : s.card,
    '--mint-soft': rgba(s.lamp, dark ? 0.14 : 0.12),
    '--accent': s.lamp,
    '--bar': s.mica,
    '--placeholder': s.ink3,
    '--glow-top': dark ? s.card : s.inset,
    '--switch-off': s.raised,
    '--danger': s.remove,
  };
}

/** Hydros keeps its glass over the water: only solid surfaces, text and its lamp follow. */
function hydrosVars(s: Scheme): Record<string, string> {
  const dark = s.mode === 'dark';
  return {
    '--bg': s.page,
    '--surface-solid': s.card,
    '--surface-2': s.inset,
    '--text': s.ink,
    '--text-soft': s.ink2,
    '--muted': s.ink3,
    '--cyan': s.lamp,
    '--cyan-soft': rgba(s.lamp, dark ? 0.17 : 0.13),
    '--cyan-ink': dark ? s.onLamp : s.card,
    // The family's shared pieces (account, backup, the family list) read Proairetos's names.
    '--color-text': s.ink,
    '--color-text-muted': s.ink2,
    '--color-text-faint': s.ink3,
    '--color-border': rgba(s.ink, 0.13),
    '--color-surface': s.card,
    '--color-accent-strong': s.lamp,
    '--color-accent-ink': dark ? s.onLamp : s.card,
  };
}

/** Praxis is written with Proairetos's names; a dark study room in either appearance. */
function praxisVars(s: Scheme): Record<string, string> {
  return {
    '--color-ink': s.page,
    '--color-ink-raised': s.wall,
    '--color-bg-rgb': triple(s.page),
    '--color-bar-rgb': triple(s.mica),
    '--color-surface': s.card,
    '--color-surface-raised': s.inset,
    '--color-surface-soft': rgba(s.ink, 0.06),
    '--color-border': rgba(s.ink, 0.13),
    '--color-text': s.ink,
    '--color-text-muted': s.ink2,
    '--color-text-faint': s.ink3,
    '--color-accent': s.lamp,
    '--color-accent-strong': s.lampSoft,
    '--color-accent-soft': rgba(s.lamp, 0.15),
    '--color-accent-ink': s.onLamp,
    '--color-accent-rgb': triple(s.lamp),
  };
}

/** Theoria's reading room: night surfaces from the room, its brass lamp from the scheme. */
function theoriaVars(s: Scheme): Record<string, string> {
  return {
    '--theoria-bg': s.page,
    '--theoria-surface': s.card,
    '--theoria-surface-2': s.inset,
    '--theoria-ink': s.ink,
    '--theoria-muted': s.ink2,
    '--theoria-faint': s.ink3,
    '--theoria-brass': s.lamp,
    '--theoria-border': rgba(s.ink, 0.14),
    ...praxisVars(s),
  };
}

/** Apps that stay a dark room in either appearance. */
export const ALWAYS_DARK = new Set(['praxis', 'theoria']);

export function familyVars(s: Scheme, app: string): Record<string, string> {
  if (app === 'hydros') return hydrosVars(s);
  if (app === 'praxis') return praxisVars(s);
  if (app === 'theoria') return theoriaVars(s);
  return shellVars(s);
}
