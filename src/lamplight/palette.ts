import { oklch, toOklch, type Hex } from './color';

/** The shared neutral surfaces. App rooms may add a restrained tint, but these are Lamplight's canonical anchors. */
export const FOUNDATION = {
  dark: {
    background: '#101923' as Hex,
    surface: '#1B2A38' as Hex,
    mica: '#283642' as Hex,
    overlay: '#33434F' as Hex,
    input: '#172530' as Hex,
    border: '#43525C' as Hex,
    divider: '#33424D' as Hex,
    text: '#E9E5DC' as Hex,
    secondary: '#C2C5C3' as Hex,
    muted: '#A7ADA9' as Hex,
  },
  light: {
    background: '#F4F1EA' as Hex,
    surface: '#FFFCF7' as Hex,
    mica: '#E8E4DB' as Hex,
    overlay: '#F0ECE4' as Hex,
    input: '#F0ECE4' as Hex,
    border: '#B9BDBA' as Hex,
    divider: '#D5D4CE' as Hex,
    text: '#1D2730' as Hex,
    secondary: '#3E4B55' as Hex,
    muted: '#56616A' as Hex,
  },
} as const;

export type SignatureFamilyName = 'blue' | 'green' | 'aqua' | 'violet' | 'amber' | 'coral';
export type Tone = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type TonalScale = Record<Tone, Hex>;

const TONES: readonly Tone[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS: Record<Tone, number> = { 50: 0.97, 100: 0.93, 200: 0.86, 300: 0.76, 400: 0.66, 500: 0.56, 600: 0.47, 700: 0.39, 800: 0.32, 900: 0.25, 950: 0.19 };
const CHROMA_FACTOR: Record<Tone, number> = { 50: 0.28, 100: 0.42, 200: 0.62, 300: 0.82, 400: 0.96, 500: 1, 600: 1.02, 700: 0.98, 800: 0.88, 900: 0.72, 950: 0.58 };

function scaleFrom(seed: Hex): TonalScale {
  const source = toOklch(seed);
  return Object.fromEntries(TONES.map((tone) => [tone, tone === 500 ? seed : oklch(LIGHTNESS[tone], source.C * CHROMA_FACTOR[tone], source.h)])) as TonalScale;
}

/** Canonical signature families. The 500 value is the named identity; every other tone is generated in OKLCH. */
export const SIGNATURE_FAMILIES: Record<SignatureFamilyName, { name: string; seed: Hex; tones: TonalScale }> = {
  blue: { name: 'Lamplight Blue', seed: '#4F78A8', tones: scaleFrom('#4F78A8') },
  green: { name: 'Lamplight Green', seed: '#5E8B68', tones: scaleFrom('#5E8B68') },
  aqua: { name: 'Lamplight Aqua', seed: '#3A9CA0', tones: scaleFrom('#3A9CA0') },
  violet: { name: 'Lamplight Violet', seed: '#7E6A9E', tones: scaleFrom('#7E6A9E') },
  amber: { name: 'Lamplight Amber', seed: '#B9823D', tones: scaleFrom('#B9823D') },
  coral: { name: 'Lamplight Coral', seed: '#C27669', tones: scaleFrom('#C27669') },
};

/** Status colors are shared by meaning and do not derive from the current app's signature. */
export const STATUS_COLORS = {
  dark: { success: '#7CBF92' as Hex, warning: '#E3B86D' as Hex, error: '#F08A7E' as Hex, info: '#83A9D8' as Hex, neutral: '#A7ADA9' as Hex },
  light: { success: '#2F6F45' as Hex, warning: '#8B5A1E' as Hex, error: '#A83F3B' as Hex, info: '#345F93' as Hex, neutral: '#56616A' as Hex },
} as const;

/** App-to-family assignments. Existing warm identities stay Amber; Violet is available for future reflective apps. */
export const APP_SIGNATURES: Record<string, SignatureFamilyName> = {
  proairetos: 'blue',
  askesis: 'green',
  soma: 'green',
  oikonomia: 'amber',
  hydros: 'aqua',
  poreia: 'aqua',
  praxis: 'blue',
  theoria: 'amber',
  diaita: 'amber',
  philia: 'coral',
  ergon: 'green',
  therapeia: 'blue',
  dynamis: 'amber',
  ktema: 'amber',
  phyton: 'green',
};

export const SIGNATURE_TONES = TONES;
