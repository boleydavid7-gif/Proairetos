/** Lamplight's rooms and colors by name. Their seeds and every value made from them are in src/lamplight/scheme.ts. */
export const ROOMS = ['Hearth', 'Dusk', 'Harbor', 'Grove', 'Clay', 'Slate'] as const;
export const LAMP_COLORS = ['Amber', 'Ember', 'Rose', 'Heather', 'Ink', 'Tide', 'Sage', 'Pewter'] as const;
export const WALL_STYLES = ['paper', 'ink', 'wood'] as const;
export type Room = (typeof ROOMS)[number];
export type LampColor = (typeof LAMP_COLORS)[number];
export type WallStyle = (typeof WALL_STYLES)[number];
/** A named color, the room's own ("match"), or a hue of the person's own ("hue:210"). */
export type ColorChoice = LampColor | 'match' | `hue:${number}`;
export const DEFAULT_ROOM: Room = 'Hearth';

export const isRoom = (value: unknown): value is Room => (ROOMS as readonly unknown[]).includes(value);
export const isWallStyle = (value: unknown): value is WallStyle => (WALL_STYLES as readonly unknown[]).includes(value);
export const isColorChoice = (value: unknown): value is ColorChoice =>
  value === 'match' ||
  (LAMP_COLORS as readonly unknown[]).includes(value) ||
  (typeof value === 'string' && /^hue:(\d|[1-9]\d|[12]\d\d|3[0-5]\d)$/.test(value));

/** The hue of a color of the person's own, or null for a named one. */
export const ownHue = (color: ColorChoice): number | null => (color.startsWith('hue:') ? Number(color.slice(4)) : null);
