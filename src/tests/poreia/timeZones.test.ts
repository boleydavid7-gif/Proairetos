import { describe, expect, it } from 'vitest';
import { apartText, hoursApart, offsetMinutes, sleepShift } from '../../poreia/core/timeZones';

describe('time at the place', () => {
  const winter = new Date('2026-11-10T12:00:00Z');
  it('reads offsets and the difference, with daylight saving', () => {
    expect(offsetMinutes('America/New_York', winter)).toBe(-300);
    expect(offsetMinutes('America/New_York', new Date('2026-07-10T12:00:00Z'))).toBe(-240);
    expect(offsetMinutes('Asia/Kolkata', winter)).toBe(330);
    expect(hoursApart('America/New_York', 'Europe/Lisbon', winter)).toBe(5);
    expect(hoursApart('Europe/Lisbon', 'America/Los_Angeles', winter)).toBe(-8);
  });

  it('says it plainly', () => {
    expect(apartText(5)).toBe('5 hours later there');
    expect(apartText(-1)).toBe('1 hour earlier there');
    expect(apartText(5.5)).toBe('5.5 hours later there');
    expect(apartText(0)).toBe('Same time as home');
  });

  it('shifts sleep an hour a day toward the place, up to three days', () => {
    expect(sleepShift(5, '2026-11-10', '22:30', 8)).toEqual([
      { date: '2026-11-07', bed: '21:30', wake: '05:30', light: 'morning' },
      { date: '2026-11-08', bed: '20:30', wake: '04:30', light: 'morning' },
      { date: '2026-11-09', bed: '19:30', wake: '03:30', light: 'morning' },
    ]);
    expect(sleepShift(-3, '2026-11-10', '23:30', 7.5).map((day) => day.bed)).toEqual(['00:30', '01:30', '02:30']);
    expect(sleepShift(2, '2026-11-10', '22:30', 8)).toEqual([]);
  });
});
