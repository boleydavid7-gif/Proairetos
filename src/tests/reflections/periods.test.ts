import { isWithin, periodRange } from '../../core/reflections/periods';

// Wednesday, 1 October 2026, 15:30 local time.
const now = new Date(2026, 9, 1, 15, 30);

describe('reflect periods', () => {
  it('covers the whole local day', () => {
    const { start, end } = periodRange('today', now);
    expect(start).toEqual(new Date(2026, 9, 1));
    expect(end).toEqual(new Date(2026, 9, 2));
  });

  it('starts weeks on Monday by default, or Sunday when asked', () => {
    expect(periodRange('week', now).start).toEqual(new Date(2026, 8, 28));
    expect(periodRange('week', now, 0).start).toEqual(new Date(2026, 8, 27));
    expect(periodRange('week', now).end).toEqual(new Date(2026, 9, 5));
  });

  it('covers the calendar month', () => {
    const { start, end } = periodRange('month', now);
    expect(start).toEqual(new Date(2026, 9, 1));
    expect(end).toEqual(new Date(2026, 10, 1));
  });

  it('treats the end as exclusive', () => {
    const range = periodRange('today', now);
    expect(isWithin(new Date(2026, 9, 1).toISOString(), range)).toBe(true);
    expect(isWithin(new Date(2026, 9, 2).toISOString(), range)).toBe(false);
  });
});
