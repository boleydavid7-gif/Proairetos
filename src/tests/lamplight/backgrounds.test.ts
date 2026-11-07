import { describe, expect, it } from 'vitest';
import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, isBackground } from '../../core/look/lamplight';
import { backgroundOf, backgroundPreviewOf } from '../../app/backgrounds';

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
      expect(dark).toMatch(/^url\("data:image\/svg\+xml,/);
      expect(light).toMatch(/^url\("data:image\/svg\+xml,/);
      expect(dark).not.toContain('https://');
      expect(light).not.toContain('https://');
      expect(dark).not.toBe(light);
    }
  });

  it('renders landscape previews that show the actual scene rather than cropping the portrait wallpaper', () => {
    for (const background of BACKGROUND_OPTIONS) {
      if (background.id === 'lamplight') continue;
      const preview = backgroundPreviewOf(background.id, 'dark');
      expect(preview).toMatch(/^url\("data:image\/svg\+xml,/);
      const svg = decodeURIComponent(preview.slice('url("data:image/svg+xml,'.length, -2));
      expect(svg).toContain('viewBox="0 ');
      expect(svg).toContain(' 1200 675"');
    }
  });

  it('shows a recognizable forest, a lake with reflections, and a fuller night sky in previews', () => {
    const forest = decodeURIComponent(backgroundPreviewOf('forest', 'dark').slice('url("data:image/svg+xml,'.length, -2));
    const lake = decodeURIComponent(backgroundPreviewOf('lake', 'dark').slice('url("data:image/svg+xml,'.length, -2));
    const night = decodeURIComponent(backgroundPreviewOf('night', 'dark').slice('url("data:image/svg+xml,'.length, -2));

    expect((forest.match(/translate\(/g) ?? []).length).toBeGreaterThanOrEqual(16);
    expect(lake).toContain('stroke-opacity=".58"');
    expect((night.match(/<circle /g) ?? []).length).toBeGreaterThanOrEqual(30);
  });

  it('fades the scene into the chosen page surface', () => {
    expect(backgroundOf('forest', 'dark', '#101820')).not.toBe(backgroundOf('forest', 'dark', '#182430'));
  });
});
