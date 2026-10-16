/** Lamplight's rooms and colors by name. The values live in app/lamplightPalette.ts (made by
 *  scripts/design/lamplight-palette.py); keep these lists in step with it. */
export const ROOMS = ['Hearth', 'Dusk', 'Harbor', 'Grove', 'Clay', 'Slate'] as const;
export const LAMP_COLORS = ['Amber', 'Ember', 'Rose', 'Heather', 'Ink', 'Tide', 'Sage', 'Pewter'] as const;
export type Room = (typeof ROOMS)[number];
export type LampColor = (typeof LAMP_COLORS)[number];
export type ColorChoice = LampColor | 'match';
export const DEFAULT_ROOM: Room = 'Hearth';

export const isRoom = (value: unknown): value is Room => (ROOMS as readonly unknown[]).includes(value);
export const isColorChoice = (value: unknown): value is ColorChoice =>
  value === 'match' || (LAMP_COLORS as readonly unknown[]).includes(value);
