import { describe, expect, it } from 'vitest';
import { materialFootSvg, wallpaperStyleSvg, type WallArt } from '../../app/wallpaper';

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
