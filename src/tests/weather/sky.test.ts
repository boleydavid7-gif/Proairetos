import { describe, expect, it } from 'vitest';
import { skyKind, skyLabel } from '../../core/weather/sky';

describe('sky', () => {
  it('maps weather codes to a plain sky', () => {
    expect([0, 2, 3, 45, 61, 81, 73, 86, 95].map(skyKind)).toEqual(['clear', 'partly', 'cloudy', 'fog', 'rain', 'rain', 'snow', 'snow', 'storm']);
  });

  it('calls a clear night a clear night', () => {
    expect(skyLabel({ code: 0, isDay: false })).toBe('Clear night');
    expect(skyLabel({ code: 0, isDay: true })).toBe('Clear');
  });
});
