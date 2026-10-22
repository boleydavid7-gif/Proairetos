import { describe, expect, it } from 'vitest';
import { tilesAround } from '../../poreia/app/offline';

describe('the map kept for offline', () => {
  it('covers the place at each zoom, the center tile included', () => {
    // Lisbon's center at zoom 15 is tile 15/15552/12556 on OpenStreetMap's grid.
    const close = tilesAround(38.7167, -9.1333, 15, 2.5);
    expect(close).toContainEqual([15, 15552, 12556]);
    expect(close.length).toBeGreaterThan(20);
    expect(close.length).toBeLessThan(80);
    expect(tilesAround(38.7167, -9.1333, 10, 20).length).toBeLessThanOrEqual(9);
  });
});
