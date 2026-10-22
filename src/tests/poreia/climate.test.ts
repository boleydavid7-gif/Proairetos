import { describe, expect, it } from 'vitest';
import { monthsOf, monthsTouched, pastYearRange } from '../../poreia/core/climate';

describe('when to go', () => {
  it('averages each month and counts rainy days on a 30-day month', () => {
    const days = [
      { date: '2025-07-01', high: 30, low: 20, rain: 0 },
      { date: '2025-07-02', high: 32, low: 22, rain: 4 },
      { date: '2026-01-01', high: 10, low: 2, rain: 1 },
      { date: '2026-01-02', high: Number.NaN, low: 1 },
    ];
    expect(monthsOf(days)).toEqual([
      { month: 1, high: 10, low: 2, rainyDays: 30, days: 1 },
      { month: 7, high: 31, low: 21, rainyDays: 15, days: 2 },
    ]);
  });

  it('takes the twelve whole months before this one, and marks the months a trip touches', () => {
    expect(pastYearRange('2026-10-22')).toEqual({ from: '2025-10-01', until: '2026-09-30' });
    expect(pastYearRange('2026-01-05')).toEqual({ from: '2025-01-01', until: '2025-12-31' });
    expect([...monthsTouched('2026-12-28', '2027-01-03')]).toEqual([12, 1]);
    expect(monthsTouched().size).toBe(0);
  });
});
