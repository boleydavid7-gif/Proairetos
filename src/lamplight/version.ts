/** Lamplight's version: the minor number moves with each round of the system, the major only if a role or token
 *  name changes meaning. Shown on the public guide, with what each version brought. */
export const LAMPLIGHT_VERSION = '1.4';

export const LAMPLIGHT_CHANGES: { version: string; lines: string[] }[] = [
  { version: '1.4', lines: ['Canonical Midnight, Navy, Warm Mica, Linen and Stone neutrals.', 'Blue, Green, Aqua, Violet, Amber and Coral signature families with generated 50–950 tones.', 'Shared app and status color roles with contrast checks.'] },
  { version: '1.3', lines: ['No blur: bars and docks are mica, an opaque tint of the room.', 'Docks tuck away on the way down; rows have long-press menus; springs; concentric corners; one waiting mark; tablets, high contrast and right to left.'] },
  { version: '1.2', lines: ['One bar at the top on phones: the app name left; actions, Settings and the family right, out of the dock.', 'The back swipe and sheets are held: they follow the finger, take a flick, and spring back when let go short.', 'Praxis, Theoria and Hydros on the layout rhythm.'] },
  { version: '1.1', lines: ['Layout: five patterns on four numbers; text never under 12 px.', 'A tapped card grows into its page; the lit tab hands off.', 'Every scene drawn under one light.'] },
  { version: '1.0', lines: ['Schemes from a room and a lamp, readable by construction.', 'Tokens, components, light in place of shadow, motion as light, icons with a lit state.'] },
];
