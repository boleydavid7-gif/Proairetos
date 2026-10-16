import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICON_SIZES, strokeFor } from '../../lamplight/icons';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? (name === 'tests' ? [] : sources(path)) : path.endsWith('.tsx') ? [path] : [];
  });
}

const files = sources('src').map((path) => ({ path, text: readFileSync(path, 'utf8') }));

describe('Lamplight icons', () => {
  it('keeps one weight of line across sizes', () => {
    const px = ICON_SIZES.map((size) => (strokeFor(size) * size) / 24);
    expect(px[0]).toBeCloseTo(1.5, 1);
    expect(px.at(-1)!).toBeLessThan(1.9);
    px.slice(1).forEach((each, index) => expect(each).toBeGreaterThanOrEqual(px[index]));
  });

  it('draws marks in controls, never typed characters', () => {
    const typed = files.filter(({ text }) => />\s*(×|✕|‹|›|←|→|\+|−|✓)\s*</.test(text) || /'✓'/.test(text)).map(({ path }) => path);
    expect(typed).toEqual([]);
  });

  it('sizes icons from the scale', () => {
    const off = files.flatMap(({ path, text }) =>
      [...text.matchAll(/Icon size=\{(\d+)\}/g)].filter((match) => !ICON_SIZES.includes(Number(match[1]) as never)).map((match) => `${path}: ${match[0]}`),
    );
    expect(off).toEqual([]);
  });
});
