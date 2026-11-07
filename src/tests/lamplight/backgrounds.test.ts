import { describe, expect, it } from 'vitest';
import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, isBackground } from '../../core/look/lamplight';
import { backgroundOf, backgroundPreviewOf, backgroundSizeOf, backgroundWideOf } from '../../app/backgrounds';

describe('Lamplight backgrounds', () => {
  it('offers the complete named collection and keeps Lamplight as the default', () => {
    expect(BACKGROUND_OPTIONS.map((background) => background.name)).toEqual([
      'Lamplight',
      'Dawn',
      'Twilight',
      'Night',
      'Horizon',
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

  it('keeps raster wallpapers proportional instead of stretching them to the viewport', () => {
    expect(backgroundSizeOf('dawn')).toBe('cover');
    expect(backgroundSizeOf('twilight')).toBe('cover');
    expect(backgroundSizeOf('night')).toBe('cover');
    for (const background of BACKGROUND_OPTIONS) {
      if (background.id === 'lamplight' || background.id === 'dawn' || background.id === 'twilight' || background.id === 'night') continue;
      expect(backgroundSizeOf(background.id)).toBe('100% 100%');
    }
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
      } else if (background.id === 'night') {
        expect(dark).toContain('night-dark-mobile.avif');
        expect(light).toContain('night-light-mobile.avif');
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

  it('uses mode-matched landscape assets for Dawn, Twilight, and Night on wide screens', () => {
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

    const darkNight = backgroundWideOf('night', 'dark', '#101820');
    const lightNight = backgroundWideOf('night', 'light', '#F4F0E9');
    expect(darkNight).toContain('night-dark-desktop.avif');
    expect(lightNight).toContain('night-light-desktop.avif');
    expect(darkNight).toContain('linear-gradient');
    expect(lightNight).toContain('linear-gradient');
    expect(backgroundWideOf('forest', 'dark')).not.toBe(backgroundOf('forest', 'dark'));
    expect(backgroundWideOf('forest', 'light')).not.toBe(backgroundOf('forest', 'light'));
    expect(backgroundPreviewOf('forest', 'dark')).not.toBe(backgroundPreviewOf('forest', 'light'));
    expect(backgroundWideOf('forest', 'dark')).not.toBe(backgroundWideOf('forest', 'light'));
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
      } else if (background.id === 'night') {
        expect(preview).toContain('night-dark-desktop.avif');
        expect(backgroundPreviewOf('night', 'light')).toContain('night-light-desktop.avif');
        expect(preview).not.toBe(backgroundPreviewOf('night', 'light'));
      } else {
        expect(preview.startsWith('url("data:image/svg+xml,')).toBe(true);
        const svg = decodeURIComponent(preview.slice('url("data:image/svg+xml,'.length, -2));
        expect(svg).toContain('viewBox="0 ');
        expect(svg).toContain(' 1200 675"');
      }
    }
  });

  it('shows the Horizon sun and hills, lake reflections, and the bundled Night artwork in previews', () => {
    const forest = decodeURIComponent(backgroundPreviewOf('forest', 'dark').slice('url("data:image/svg+xml,'.length, -2));
    const lake = decodeURIComponent(backgroundPreviewOf('lake', 'dark').slice('url("data:image/svg+xml,'.length, -2));

    expect(forest).toContain('id="sun-halo"');
    expect(forest).toContain('fill="url(#sun)"');
    expect(forest).toContain('id="ridgeFront"');
    expect(forest).not.toContain('translate(');
    expect(lake).toContain('stroke-opacity=".52"');
    expect(backgroundPreviewOf('night', 'dark')).toContain('night-dark-desktop.avif');
    expect(backgroundPreviewOf('night', 'light')).toContain('night-light-desktop.avif');
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
      if (background.id === 'night') {
        const full = backgroundOf('night', 'dark', '#101820');
        const wide = backgroundWideOf('night', 'dark', '#101820');
        const preview = backgroundPreviewOf('night', 'dark');
        expect(full).toContain('night-dark-mobile.avif');
        expect(wide).toContain('night-dark-desktop.avif');
        expect(preview).toContain('night-dark-desktop.avif');
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

  it('builds four proportional Horizon variants for mobile and desktop in both appearances', () => {
    const decode = (image: string) => decodeURIComponent(image.slice('url("data:image/svg+xml,'.length, -2));
    const mobileDark = decode(backgroundOf('forest', 'dark'));
    const mobileLight = decode(backgroundOf('forest', 'light'));
    const desktopDark = decode(backgroundWideOf('forest', 'dark'));
    const desktopLight = decode(backgroundWideOf('forest', 'light'));

    expect(mobileDark).toContain('viewBox="0 0 1200 1600"');
    expect(mobileLight).toContain('viewBox="0 0 1200 1600"');
    expect(desktopDark).toContain('viewBox="0 0 1200 675"');
    expect(desktopLight).toContain('viewBox="0 0 1200 675"');
    expect(mobileDark).toContain('#102B3C');
    expect(mobileLight).toContain('#D8E5E5');
    expect(desktopDark).not.toBe(desktopLight);
  });

  it('fades the scene into the chosen page surface', () => {
    expect(backgroundOf('forest', 'dark', '#101820')).not.toBe(backgroundOf('forest', 'dark', '#182430'));
  });
});
