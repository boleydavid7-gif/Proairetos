import { toOklch } from './color';
import { APP_SIGNATURES, FOUNDATION, SIGNATURE_FAMILIES, type SignatureFamilyName } from './palette';
import type { LampSeed, RoomSeed } from './scheme';

/*
 * Each companion app shares Lamplight's neutral room and carries its own signature lamp. Proairetos alone takes the
 * person's selected room and lamp. The scheme makes every role from the shared foundation and holds it to contrast.
 */
const APP_COLORS: Record<string, { family: SignatureFamilyName }> = {
  askesis: { family: 'green' },
  soma: { family: 'green' },
  oikonomia: { family: 'amber' },
  hydros: { family: 'aqua' },
  poreia: { family: 'aqua' },
  praxis: { family: 'blue' },
  theoria: { family: 'amber' },
  diaita: { family: 'amber' },
  philia: { family: 'coral' },
  ergon: { family: 'green' },
  therapeia: { family: 'blue' },
  dynamis: { family: 'amber' },
  ktema: { family: 'amber' },
  phyton: { family: 'green' },
};

export function appTheme(app: string): { room: RoomSeed; lamp: LampSeed } | null {
  const colors = APP_COLORS[app];
  if (!colors) return null;
  const dark = toOklch(FOUNDATION.dark.background);
  const light = toOklch(FOUNDATION.light.background);
  const lamp = toOklch(SIGNATURE_FAMILIES[colors.family].seed);
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

export { APP_SIGNATURES };
