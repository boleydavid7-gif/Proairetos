import { describe, expect, it } from 'vitest';
import { sunTimes } from './sun';

const near = (actual: Date, expected: string) => expect(Math.abs(actual.getTime() - Date.parse(expected))).toBeLessThan(4 * 60_000);

describe('sunTimes', () => {
  it('finds a London midsummer sunrise and sunset', () => {
    const times = sunTimes('2026-06-21', 51.5074, -0.1278)!;
    near(times.rise, '2026-06-21T03:43:00Z');
    near(times.set, '2026-06-21T20:21:00Z');
  });

  it('finds a New York winter sunrise', () => {
    near(sunTimes('2026-01-01', 40.7128, -74.006)!.rise, '2026-01-01T12:20:00Z');
  });

  it('finds a Sydney sunrise east of Greenwich', () => {
    near(sunTimes('2026-12-21', -33.8688, 151.2093)!.rise, '2026-12-20T18:41:00Z');
  });

  it('says nothing for a polar night', () => {
    expect(sunTimes('2026-12-21', 78.22, 15.65)).toBeUndefined();
  });
});
