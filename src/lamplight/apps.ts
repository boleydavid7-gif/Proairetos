import { toOklch } from './color';
import { APP_COLOR_PROFILES, APP_SIGNATURES, FOUNDATION } from './palette';
import type { LampSeed, RoomSeed } from './scheme';

/*
 * Each companion app shares Lamplight's neutral room and carries its own signature lamp. Proairetos alone takes the
 * person's selected room and lamp. The scheme makes every role from the shared foundation and holds it to contrast.
 */
export function appTheme(app: string): { room: RoomSeed; lamp: LampSeed } | null {
  const colors = APP_COLOR_PROFILES[app];
  if (!colors) return null;
  const dark = toOklch(FOUNDATION.dark.background);
  const light = toOklch(FOUNDATION.light.background);
  const lamp = toOklch(colors.seed);
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

export const THEMED_APPS = Object.keys(APP_COLOR_PROFILES).filter((app) => app !== 'proairetos');

export { APP_SIGNATURES };
