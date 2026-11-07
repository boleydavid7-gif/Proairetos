import { describe, expect, it } from 'vitest';
import { materialFootSvg, staticWallpaperStyleSvg, wallpaperStyleSvg, type WallArt } from '../../app/wallpaper';
import { warmedLamp } from '../../lamplight/daylight';
import { LAMP_SEEDS, makeScheme, ROOM_SEEDS } from '../../lamplight/scheme';

const art: WallArt = {
  sky: '#17202b',
  glow: '#d7a86e',
  b1: '#26384a',
  b2: '#3d4650',
  b3: '#202c38',
};

describe('Lamplight wallpaper rendering', () => {
  it('reuses the generated wall for identical appearance inputs', () => {
    const first = wallpaperStyleSvg(art, '#101820', false, false, undefined, 'paper');
    const second = wallpaperStyleSvg(art, '#101820', false, false, undefined, 'paper');
    expect(second).toBe(first);
  });

  it('keeps material choices distinct', () => {
    const paper = wallpaperStyleSvg(art, '#101820', false, false, undefined, 'paper');
    const wood = wallpaperStyleSvg(art, '#101820', false, false, undefined, 'wood');
    const ink = wallpaperStyleSvg(art, '#101820', false, false, undefined, 'ink');
    expect(wood).not.toBe(paper);
    expect(ink).not.toBe(paper);
    expect(ink).not.toBe(wood);
  });

  it('keeps Proairetos wallpaper artwork fixed as day light changes', () => {
    const room = ROOM_SEEDS.Hearth;
    const morning = makeScheme(room, warmedLamp(LAMP_SEEDS.Amber, 0.12), 'dark');
    const midday = makeScheme(room, warmedLamp(LAMP_SEEDS.Amber, 0.5), 'dark');
    const evening = makeScheme(room, warmedLamp(LAMP_SEEDS.Amber, 0.92), 'dark');

    const wallAt = (scheme: ReturnType<typeof makeScheme>, wide = false) =>
      staticWallpaperStyleSvg(scheme.art, scheme.page, false, wide, 'paper');

    expect(wallAt(midday)).toBe(wallAt(morning));
    expect(wallAt(evening)).toBe(wallAt(morning));
    expect(wallAt(midday, true)).toBe(wallAt(morning, true));
    expect(wallAt(evening, true)).toBe(wallAt(morning, true));
  });

  it('does not use full-surface SVG turbulence, displacement or blur filters for material walls', () => {
    for (const style of ['paper', 'wood', 'ink'] as const) {
      const wall = wallpaperStyleSvg(art, '#101820', false, false, undefined, style);
      expect(wall).not.toMatch(/feTurbulence|feDisplacementMap|feGaussianBlur/);
    }
  });

  it('reuses the matching material foot', () => {
    const first = materialFootSvg(art, '#101820', false, false, 'wood');
    const second = materialFootSvg(art, '#101820', false, false, 'wood');
    expect(second).toBe(first);
  });
});
