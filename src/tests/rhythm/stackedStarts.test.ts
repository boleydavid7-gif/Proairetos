import { describe, expect, it } from 'vitest';
import { stackedStarts } from '../../core/rhythm/openTime';
import { atTime } from '../../core/scheduling/dates';

const stretch = { start: atTime('2026-11-05', '09:00'), end: atTime('2026-11-05', '10:30') };

describe('several things in one stretch of open time', () => {
  it('puts them one after another, half an hour each', () => {
    const { starts, fit } = stackedStarts(stretch, stretch.start, 3);
    expect(starts.map((date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`)).toEqual(['9:00', '9:30', '10:00']);
    expect(fit).toBe(3);
  });

  it('counts how many fit when the stretch is short or the start is late', () => {
    expect(stackedStarts(stretch, stretch.start, 4).fit).toBe(3);
    expect(stackedStarts(stretch, atTime('2026-11-05', '09:45'), 3).fit).toBe(1);
    expect(stackedStarts(stretch, atTime('2026-11-05', '10:15'), 1).fit).toBe(0);
    expect(stackedStarts(stretch, atTime('2026-11-05', '08:30'), 1).fit).toBe(0);
  });
});
