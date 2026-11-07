import { describe, expect, it } from 'vitest';
import { hourAt, sceneKindFor, sceneSvg, sceneTimeAt } from '../../poreia/core/scene';

describe('trip pictures', () => {
  it('picks the kind from what the place search knows', () => {
    expect(sceneKindFor({ lat: 46.5, elevation: 2100 })).toBe('snow');
    expect(sceneKindFor({ lat: 64.1, elevation: 30 })).toBe('snow');
    expect(sceneKindFor({ lat: 47.3, elevation: 900 })).toBe('mountains');
    expect(sceneKindFor({ lat: 35.0, elevation: 50, population: 1_460_000 })).toBe('city');
    expect(sceneKindFor({ lat: 38.7, elevation: 20 })).toBe('coast');
    expect(sceneKindFor({ lat: 9.9, elevation: 5 })).toBe('tropics');
    expect(sceneKindFor({ lat: 43.8, elevation: 150 })).toBe('hills');
    expect(sceneKindFor({})).toBe('hills');
  });

  it('lights it by the hour at the place', () => {
    expect([6, 12, 18, 23, 2].map(sceneTimeAt)).toEqual(['dawn', 'day', 'dusk', 'night', 'night']);
    expect(hourAt('Asia/Tokyo', new Date('2026-11-12T14:00:00Z'))).toBe(23);
    expect(hourAt('Not/AZone', new Date())).toBeGreaterThanOrEqual(0);
  });

  it('draws the same place the same way, apart from another picture on the page', () => {
    const one = sceneSvg({ kind: 'coast', time: 'dusk', seed: 'LisbonPT', id: 'a' });
    expect(sceneSvg({ kind: 'coast', time: 'dusk', seed: 'LisbonPT', id: 'a' })).toBe(one);
    expect(sceneSvg({ kind: 'coast', time: 'dusk', seed: 'PortoPT', id: 'a' })).not.toBe(one);
    expect(one).toContain('id="as"');
    expect(sceneSvg({ kind: 'city', time: 'night', seed: 'x', id: 'b', small: true }).length).toBeLessThan(sceneSvg({ kind: 'city', time: 'night', seed: 'x', id: 'b' }).length);
  });
});
