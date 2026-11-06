import { afterEach, describe, expect, it } from 'vitest';
import { dayWords } from '../../core/search/dayWords';

/*
 * A run or a strength session is dated by a day (`YYYY-MM-DD`). Search titles it "Run, Oct 20": the same day wherever the
 * device is. Read as a timestamp, the day came out as the evening before west of UTC (Los Angeles read Oct 20 as Oct 19).
 */
const zones = ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Kolkata', 'Europe/London'];
const original = process.env.TZ;
afterEach(() => {
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
});

describe('a date-only day in a search title', () => {
  for (const zone of zones) {
    it(`reads the same day in ${zone}`, () => {
      process.env.TZ = zone;
      expect(dayWords('2026-10-20', '2026-11-05')).toBe(new Date(2026, 9, 20).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      expect(dayWords('2026-10-20', '2026-11-05')).toMatch(/Oct\s*20|20\s*Oct/);
      expect(dayWords('2026-11-05', '2026-11-05')).toBe('Today');
      expect(dayWords('2026-11-04', '2026-11-05')).toBe('Yesterday');
      expect(dayWords('2026-01-01', '2026-01-02')).toBe('Yesterday');
      expect(dayWords('2025-12-31', '2026-01-01')).toBe('Yesterday');
      expect(dayWords('2026-03-08', '2026-03-09')).toBe('Yesterday');
    });
  }
  it('counts days across a clock change without shifting a day', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(dayWords('2026-03-07', '2026-03-09')).toMatch(/Mar\s*7|7\s*Mar/);
    expect(dayWords('2026-11-01', '2026-11-02')).toBe('Yesterday');
  });
});
