/*
 * Each app's identity inside Lamplight: a short, fixed set of choices an app may make, and nothing else. Layout,
 * cards and lists, the bars, the undo bar, type sizes, wording and every contrast rule stay shared; these only give
 * the room its character.
 *
 *  light     the quality of the one lamp: the tint of the glow at the top of a page and of the light on lit marks
 *  pattern   one faint pattern in the wall at the top of the page, fading out before the content gets busy
 *  tempo     which of the family's springs the app moves on (reduced motion still stills them all)
 *  numerals  how its figures sit: tabular (columns of money), clock (timers and times), plain (proportional)
 *  shape     one shape accent, used only on its signature element
 *  signature the one element only this app has, which carries its personality
 */

export type LightQuality = 'lamp' | 'dawn' | 'hearth' | 'desk' | 'ripple' | 'harbor' | 'moon' | 'sun' | 'glass' | 'ember' | 'garden';
export type WallPattern = 'none' | 'water' | 'ledger' | 'paper' | 'contour' | 'leaf' | 'tile' | 'stars' | 'weave' | 'rings' | 'ladder' | 'grain';
export type Tempo = 'crisp' | 'steady' | 'fluid' | 'slow' | 'still';
export type Numerals = 'plain' | 'tabular' | 'clock';
export type ShapeAccent = 'soft' | 'pill' | 'drop' | 'page' | 'tile' | 'leaf';

export type AppIdentity = {
  light: LightQuality;
  pattern: WallPattern;
  tempo: Tempo;
  numerals: Numerals;
  shape: ShapeAccent;
  /** The signature element, in words (the guide shows it). */
  signature: string;
  /** One line on the character the choices add up to. */
  character: string;
};

export const APP_IDENTITY: Record<string, AppIdentity> = {
  proairetos: { light: 'lamp', pattern: 'none', tempo: 'steady', numerals: 'plain', shape: 'soft', signature: 'The room itself: the person’s own wallpaper and lamp', character: 'The study the others open from' },
  askesis: { light: 'dawn', pattern: 'contour', tempo: 'crisp', numerals: 'tabular', shape: 'pill', signature: 'The session bar, one block per stretch', character: 'Early light on a hill path' },
  soma: { light: 'hearth', pattern: 'weave', tempo: 'steady', numerals: 'plain', shape: 'soft', signature: 'The recipe card with its grade', character: 'A kitchen with the oven on' },
  oikonomia: { light: 'desk', pattern: 'ledger', tempo: 'steady', numerals: 'tabular', shape: 'page', signature: 'The month as a ledger strip', character: 'An account book under a desk lamp' },
  hydros: { light: 'ripple', pattern: 'water', tempo: 'fluid', numerals: 'plain', shape: 'drop', signature: 'The day’s amount filling up', character: 'Light moving on water' },
  poreia: { light: 'harbor', pattern: 'contour', tempo: 'fluid', numerals: 'plain', shape: 'soft', signature: 'The route between a trip’s places', character: 'A map spread out at dusk' },
  praxis: { light: 'desk', pattern: 'tile', tempo: 'still', numerals: 'clock', shape: 'page', signature: 'The timer for the block in hand', character: 'Squared paper and a quiet clock' },
  theoria: { light: 'desk', pattern: 'paper', tempo: 'slow', numerals: 'plain', shape: 'page', signature: 'The reading page', character: 'A reading lamp over paper' },
  diaita: { light: 'moon', pattern: 'stars', tempo: 'slow', numerals: 'clock', shape: 'soft', signature: 'The night, from bed to waking', character: 'A room at night, the moon outside' },
  philia: { light: 'hearth', pattern: 'rings', tempo: 'steady', numerals: 'plain', shape: 'soft', signature: 'The two circles of a person’s initials', character: 'Warm light shared at a table' },
  ergon: { light: 'sun', pattern: 'tile', tempo: 'crisp', numerals: 'plain', shape: 'tile', signature: 'The day’s chores by room', character: 'A bright kitchen floor' },
  therapeia: { light: 'glass', pattern: 'grain', tempo: 'steady', numerals: 'clock', shape: 'soft', signature: 'The day’s dose times', character: 'Clear, clean morning light' },
  dynamis: { light: 'ember', pattern: 'ladder', tempo: 'crisp', numerals: 'tabular', shape: 'pill', signature: 'The ladder of sets', character: 'Iron and a warm forge' },
  ktema: { light: 'hearth', pattern: 'grain', tempo: 'steady', numerals: 'tabular', shape: 'tile', signature: 'Things room by room', character: 'A barn in late sun' },
  phyton: { light: 'garden', pattern: 'leaf', tempo: 'fluid', numerals: 'plain', shape: 'leaf', signature: 'How dry each plant is', character: 'A glasshouse in green light' },
  mneme: { light: 'glass', pattern: 'paper', tempo: 'steady', numerals: 'plain', shape: 'page', signature: 'A page with its collections', character: 'Quiet blue ink on paper' },
};

/** The tint of each light quality; `lamp` is the app's own lamp color. */
export const LIGHT_TINTS: Record<LightQuality, string> = {
  lamp: 'var(--ll-lamp, #c9a274)',
  dawn: '#ffc98a',
  hearth: '#ffb074',
  desk: '#ffd9a0',
  ripple: '#9fe3ff',
  harbor: '#a8f0ee',
  moon: '#c9d4ff',
  sun: '#fff0b8',
  glass: '#dbe8ff',
  ember: '#ff9a5a',
  garden: '#c8f2a6',
};

const TILE_W = 120;
const TILE_H = 440;

/** The pattern's strokes and dots within one tile (120 x 440), drawn in `ink`. */
function patternBody(pattern: WallPattern, ink: string): string {
  const line = (d: string, width = 1) => `<path d='${d}' fill='none' stroke='${ink}' stroke-width='${width}' stroke-linecap='round'/>`;
  const dot = (x: number, y: number, r = 1) => `<circle cx='${x}' cy='${y}' r='${r}' fill='${ink}'/>`;
  const rows = (gap: number, draw: (y: number, index: number) => string) => Array.from({ length: Math.floor(TILE_H / gap) }, (_, index) => draw(gap * (index + 0.5), index)).join('');
  switch (pattern) {
    case 'water':
      return rows(22, (y, index) => line(`M${index % 2 ? -15 : 0} ${y} q15 -5 30 0 t30 0 t30 0 t30 0 t30 0`));
    case 'ledger':
      return rows(26, (y) => line(`M0 ${y} H${TILE_W}`)) + line(`M${TILE_W - 18} 0 V${TILE_H}`);
    case 'paper':
      return Array.from({ length: 90 }, (_, index) => dot((index * 53) % TILE_W, (index * 97) % TILE_H, 0.7)).join('');
    case 'contour':
      return [0, 1, 2, 3, 4, 5].map((ring) => line(`M${-20 + ring * 6} ${120 + ring * 18} C ${20 + ring * 4} ${60 - ring * 10}, ${90 - ring * 3} ${80 + ring * 6}, ${140 - ring * 2} ${110 + ring * 14}`)).join('') + rows(110, (y) => line(`M-10 ${y + 160} C 30 ${y + 130}, 80 ${y + 190}, 130 ${y + 150}`));
    case 'leaf':
      return rows(64, (y, index) => {
        const x = index % 2 ? 30 : 90;
        return line(`M${x} ${y + 24} V${y - 24}`) + line(`M${x} ${y + 8} l-14 -12 M${x} ${y + 8} l14 -12 M${x} ${y - 8} l-11 -10 M${x} ${y - 8} l11 -10`);
      });
    case 'tile':
      return rows(30, (y) => line(`M0 ${y} H${TILE_W}`)) + [0, 30, 60, 90].map((x) => line(`M${x + 15} 0 V${TILE_H}`)).join('');
    case 'stars':
      return Array.from({ length: 26 }, (_, index) => dot((index * 47 + 11) % TILE_W, (index * 83 + 7) % TILE_H, index % 5 === 0 ? 1.4 : 0.8)).join('');
    case 'weave':
      return rows(24, (y, index) => line(`M0 ${y} H${TILE_W}`, index % 2 ? 1 : 0.6)) + [12, 36, 60, 84, 108].map((x) => line(`M${x} 0 V${TILE_H}`, 0.6)).join('');
    case 'rings':
      return [[30, 90], [90, 250], [40, 380]].map(([x, y]) => [10, 22, 34].map((r) => `<circle cx='${x}' cy='${y}' r='${r}' fill='none' stroke='${ink}'/>`).join('')).join('');
    case 'ladder':
      return line(`M30 0 V${TILE_H} M90 0 V${TILE_H}`) + rows(34, (y) => line(`M30 ${y} H90`, 1.4));
    case 'grain':
      return rows(16, (y, index) => line(`M0 ${y} C 30 ${y + (index % 3) - 1}, 60 ${y + 2}, ${TILE_W} ${y}`, 0.7));
    default:
      return '';
  }
}

/**
 * One tile of the wall pattern as a data URL, fading out toward its foot so it stays at the top of the page. The
 * ink is a light or dark stroke at a few percent, so it reads as texture in the wall, never as a mark.
 */
export function patternImage(pattern: WallPattern, mode: 'dark' | 'light'): string {
  if (pattern === 'none') return 'none';
  const ink = mode === 'dark' ? 'rgba(255,255,255,0.055)' : 'rgba(20,30,40,0.05)';
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE_W}' height='${TILE_H}'>` +
    `<defs><linearGradient id='f' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='white'/><stop offset='0.55' stop-color='white' stop-opacity='0.6'/><stop offset='1' stop-color='white' stop-opacity='0'/></linearGradient>` +
    `<mask id='m'><rect width='${TILE_W}' height='${TILE_H}' fill='url(#f)'/></mask></defs>` +
    `<g mask='url(#m)'>${patternBody(pattern, ink)}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** What `applyLamplight` puts on the root for an app: data attributes for the choices, variables for the rest. */
export function identityFor(app: string, mode: 'dark' | 'light'): { data: Record<string, string>; vars: Record<string, string> } {
  const identity = APP_IDENTITY[app] ?? APP_IDENTITY.proairetos;
  return {
    data: { llLight: identity.light, llPattern: identity.pattern, llTempo: identity.tempo, llNumerals: identity.numerals, llShape: identity.shape },
    vars: { '--ll-light-tint': LIGHT_TINTS[identity.light], '--ll-pattern-image': patternImage(identity.pattern, mode) },
  };
}
