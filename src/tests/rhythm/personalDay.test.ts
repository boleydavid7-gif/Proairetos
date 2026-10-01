import { describe, expect, it } from 'vitest';
import { dayRange, personalDate, type DaySettings } from '../../core/rhythm/personalDay';
import { atTime } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const follow: DaySettings = { startHour: 0, followShifts: true };

function block(startDate: string, start: string, endDate: string, end: string, kind: ScheduleOccurrence['kind'] = 'COMMITTED'): ScheduleOccurrence {
  return { patternId: 'p', patternName: 'Work', kind, date: startDate, start: atTime(startDate, start), end: atTime(endDate, end), changed: false };
}
const at = (date: string, time: string) => atTime(date, time);

describe('personal day', () => {
  const night = [block('2026-10-01', '19:00', '2026-10-02', '07:00')];

  it('keeps a night shift, and the wind-down after it, in the day it began', () => {
    expect(personalDate(at('2026-10-02', '03:00'), night, follow)).toBe('2026-10-01');
    expect(personalDate(at('2026-10-02', '09:30'), night, follow)).toBe('2026-10-01');
    expect(personalDate(at('2026-10-02', '15:00'), night, follow)).toBe('2026-10-02');
  });

  it('carries the evening after a late shift past midnight', () => {
    const evening = [block('2026-10-01', '15:00', '2026-10-01', '23:30')];
    expect(personalDate(at('2026-10-02', '01:00'), evening, follow)).toBe('2026-10-01');
    expect(personalDate(at('2026-10-02', '03:00'), evening, follow)).toBe('2026-10-02');
  });

  it('turns over at the chosen hour on a day with nothing scheduled', () => {
    expect(personalDate(at('2026-10-02', '00:30'), [], follow)).toBe('2026-10-02');
    expect(personalDate(at('2026-10-02', '03:00'), [], { startHour: 4, followShifts: true })).toBe('2026-10-01');
    expect(personalDate(at('2026-10-02', '04:00'), [], { startHour: 4, followShifts: true })).toBe('2026-10-02');
  });

  it('ignores shifts when asked, and ignores protected time', () => {
    expect(personalDate(at('2026-10-02', '03:00'), night, { startHour: 0, followShifts: false })).toBe('2026-10-02');
    const protectedNight = [block('2026-10-01', '22:00', '2026-10-02', '06:00', 'PROTECTED')];
    expect(personalDate(at('2026-10-02', '03:00'), protectedNight, follow)).toBe('2026-10-02');
  });

  it('does not move the day for an early shift that starts after midnight', () => {
    const early = [block('2026-10-02', '04:00', '2026-10-02', '12:00')];
    expect(personalDate(at('2026-10-02', '05:00'), early, { startHour: 5, followShifts: true })).toBe('2026-10-02');
  });

  it('gives each day a range that meets the next with no gap', () => {
    const first = dayRange('2026-10-01', night, follow);
    const second = dayRange('2026-10-02', night, follow);
    expect(first.end).toEqual(second.start);
    expect(second.start).toEqual(at('2026-10-02', '10:00'));
  });
});
