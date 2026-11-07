import { describe, expect, it } from 'vitest';
import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, isBackground } from '../../core/look/lamplight';
import { backgroundOf, backgroundPreviewOf, backgroundWideOf } from '../../app/backgrounds';

describe('Lamplight backgrounds', () => {
  it('offers the complete named collection and keeps Lamplight as the default', () => {
    expect(BACKGROUND_OPTIONS.map((background) => background.name)).toEqual([
      'Lamplight',
      'Dawn',
      'Twilight',
      'Night',
      'Forest',
      'Mountains',
      'Ocean',
      'Lake',
      'Desert',
      'Stone',
      'Aurora',
      'Ember',
    ]);
    expect(DEFAULT_BACKGROUND).toBe('lamplight');
  });

  it('validates saved background choices and rejects unknown values', () => {
    for (const background of BACKGROUND_OPTIONS) expect(isBackground(background.id)).toBe(true);
    expect(isBackground('unknown-wallpaper')).toBe(false);
    expect(isBackground(null)).toBe(false);
  });

  it('draws every optional scene locally for both appearances', () => {
    for (const background of BACKGROUND_OPTIONS) {
      if (background.id === 'lamplight') continue;
      const dark = backgroundOf(background.id, 'dark');
      const light = backgroundOf(background.id, 'light');
      if (background.id === 'dawn') {
        expect(dark).toContain('dawn-dark-mobile.avif');
        expect(light).toContain('dawn-light-mobile.avif');
        expect(dark).not.toBe(light);
      } else if (background.id === 'twilight') {
        expect(dark).toContain('twilight-dark-mobile.avif');
        expect(light).toContain('twilight-light-mobile.avif');
        expect(dark).not.toBe(light);
      } else {
        expect(dark.startsWith('url("data:image/svg+xml,')).toBe(true);
        expect(light.startsWith('url("data:image/svg+xml,')).toBe(true);
        expect(dark).not.toBe(light);
      }
      expect(dark).not.toContain('https://');
      expect(light).not.toContain('https://');
    }
  });

  it('uses mode-matched landscape assets for Dawn and Twilight on wide screens', () => {
    const darkDawn = backgroundWideOf('dawn', 'dark', '#101820');
    const lightDawn = backgroundWideOf('dawn', 'light', '#F4F0E9');
    expect(darkDawn).toContain('dawn-dark-desktop.avif');
    expect(lightDawn).toContain('dawn-light-desktop.avif');
    expect(darkDawn).toContain('linear-gradient');
    expect(lightDawn).toContain('linear-gradient');

    const darkTwilight = backgroundWideOf('twilight', 'dark', '#101820');
    const lightTwilight = backgroundWideOf('twilight', 'light', '#F4F0E9');
    expect(darkTwilight).toContain('twilight-dark-desktop.avif');
    expect(lightTwilight).toContain('twilight-light-desktop.avif');
    expect(darkTwilight).toContain('linear-gradient');
    expect(lightTwilight).toContain('linear-gradient');
    expect(backgroundWideOf('forest', 'dark')).toBe(backgroundOf('forest', 'dark'));
  });

  it('renders landscape previews that show the actual scene rather than cropping the portrait wallpaper', () => {
    for (const background of BACKGROUND_OPTIONS) {
      if (background.id === 'lamplight') continue;
      const preview = backgroundPreviewOf(background.id, 'dark');
      if (background.id === 'dawn') {
        expect(preview).toContain('dawn-dark-desktop.avif');
        expect(backgroundPreviewOf('dawn', 'light')).toContain('dawn-light-desktop.avif');
        expect(preview).not.toBe(backgroundPreviewOf('dawn', 'light'));
      } else if (background.id === 'twilight') {
        expect(preview).toContain('twilight-dark-desktop.avif');
        expect(backgroundPreviewOf('twilight', 'light')).toContain('twilight-light-desktop.avif');
        expect(preview).not.toBe(backgroundPreviewOf('twilight', 'light'));
      } else {
        expect(preview.startsWith('url("data:image/svg+xml,')).toBe(true);
        const svg = decodeURIComponent(preview.slice('url("data:image/svg+xml,'.length, -2));
        expect(svg).toContain('viewBox="0 ');
        expect(svg).toContain(' 1200 675"');
      }
    }
  });

  it('shows a recognizable forest, a lake with reflections, and a fuller night sky in previews', () => {
    const forest = decodeURIComponent(backgroundPreviewOf('forest', 'dark').slice('url("data:image/svg+xml,'.length, -2));
    const lake = decodeURIComponent(backgroundPreviewOf('lake', 'dark').slice('url("data:image/svg+xml,'.length, -2));
    const night = decodeURIComponent(backgroundPreviewOf('night', 'dark').slice('url("data:image/svg+xml,'.length, -2));

    expect(forest.split('translate(').length - 1).toBeGreaterThanOrEqual(16);
    expect(lake).toContain('stroke-opacity=".52"');
    expect((night.match(/<circle /g) ?? []).length).toBeGreaterThanOrEqual(30);
  });

  it('uses the same minimalist scene artwork in full wallpapers and landscape previews', () => {
    const decode = (image: string) => decodeURIComponent(image.slice('url("data:image/svg+xml,'.length, -2));
    for (const background of BACKGROUND_OPTIONS) {
      if (background.id === 'lamplight') continue;
      if (background.id === 'dawn') {
        const full = backgroundOf('dawn', 'dark', '#101820');
        const preview = backgroundPreviewOf('dawn', 'dark');
        expect(full).toContain('dawn-dark-mobile.avif');
        expect(preview).toContain('dawn-dark-desktop.avif');
        continue;
      }
      if (background.id === 'twilight') {
        const full = backgroundOf('twilight', 'dark', '#101820');
        const wide = backgroundWideOf('twilight', 'dark', '#101820');
        const preview = backgroundPreviewOf('twilight', 'dark');
        expect(full).toContain('twilight-dark-mobile.avif');
        expect(wide).toContain('twilight-dark-desktop.avif');
        expect(preview).toContain('twilight-dark-desktop.avif');
        continue;
      }
      const full = decode(backgroundOf(background.id, 'dark', '#101820'));
      const preview = decode(backgroundPreviewOf(background.id, 'dark'));
      expect(full).toContain('<linearGradient id="ridgeFar"');
      expect(full).toContain('<linearGradient id="ridgeMid"');
      expect(preview).toContain('<linearGradient id="ridgeFar"');
      expect(preview).toContain('viewBox="0 ');
      expect((full.match(/<path /g) ?? []).length).toBe((preview.match(/<path /g) ?? []).length);
      expect(full).toContain('<linearGradient id="fade"');
      expect(full).toContain('stop offset=".86"');
    }
  });

  it('fades the scene into the chosen page surface', () => {
    expect(backgroundOf('forest', 'dark', '#101820')).not.toBe(backgroundOf('forest', 'dark', '#182430'));
  });
});
