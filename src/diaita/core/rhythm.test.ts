import { describe, expect, it } from 'vitest';
import { atTime } from '../../core/scheduling/dates';
import { clock, dayKind, defaultRhythm, entriesOn, isNight, mainSleeps, planBetween, plannedSleepInto, sleepFacts, sleptMinutes, type WorkBlock } from './rhythm';

const block = (date: string, start: string, endDate: string, end: string, label = 'Work'): WorkBlock => ({ start: atTime(date, start), end: atTime(endDate, end), label });

const nights = [
  block('2026-10-05', '19:00', '2026-10-06', '07:00'),
  block('2026-10-06', '19:00', '2026-10-07', '07:00'),
  block('2026-10-07', '19:00', '2026-10-08', '07:00'),
];

describe('day kinds', () => {
  it('tells nights, evenings, days and days off apart', () => {
    expect(isNight(nights[0])).toBe(true);
    expect(isNight(block('2026-10-05', '15:00', '2026-10-06', '01:00'))).toBe(false);
    expect(dayKind('2026-10-05', nights)).toBe('night');
    expect(dayKind('2026-10-08', nights)).toBe('after-nights');
    expect(dayKind('2026-10-09', nights)).toBe('off');
    expect(dayKind('2026-10-05', [block('2026-10-05', '14:00', '2026-10-05', '22:30')])).toBe('evening');
    expect(dayKind('2026-10-05', [block('2026-10-05', '07:00', '2026-10-05', '15:00')])).toBe('day');
  });

  it('leaves protected time out', () => {
    expect(dayKind('2026-10-05', [{ ...nights[0], kind: 'PROTECTED' }])).toBe('off');
  });
});

describe('sleep', () => {
  it('keeps the usual bedtime with nothing on', () => {
    const [sleep] = mainSleeps('2026-10-10', '2026-10-10', [], defaultRhythm).filter((each) => clock(each.start) === '22:30' && each.start.getDate() === 10);
    expect(clock(sleep.end)).toBe('06:00');
  });

  it('goes to bed earlier before an early start', () => {
    const early = [block('2026-10-11', '06:00', '2026-10-11', '14:00')];
    const sleep = mainSleeps('2026-10-10', '2026-10-10', early, defaultRhythm).find((each) => each.start.getDate() === 10)!;
    // Up by 04:30 (an hour to get ready, half an hour to get there), 7.5 hours before that.
    expect(clock(sleep.end)).toBe('04:30');
    expect(clock(sleep.start)).toBe('21:00');
  });

  it('goes to bed after getting home from a late finish', () => {
    const late = [block('2026-10-10', '15:00', '2026-10-10', '23:00')];
    const sleep = mainSleeps('2026-10-10', '2026-10-10', late, defaultRhythm).find((each) => each.after === 'evening' && each.start >= late[0].end)!;
    expect(clock(sleep.start)).toBe('00:00');
  });

  it('sleeps after each night once home, and briefly after the last', () => {
    const sleeps = mainSleeps('2026-10-05', '2026-10-08', nights, defaultRhythm);
    const afterNights = sleeps.filter((sleep) => sleep.after !== 'evening');
    expect(afterNights.map((sleep) => clock(sleep.start))).toEqual(['07:30', '07:30', '07:30']);
    expect(afterNights.map((sleep) => sleep.after)).toEqual(['night', 'night', 'last-night']);
    expect(clock(afterNights[0].end)).toBe('15:00');
    expect(clock(afterNights[2].end)).toBe('11:30');
    // A full night follows the short sleep.
    const back = sleeps.find((sleep) => sleep.after === 'evening' && sleep.start.getDate() === 8)!;
    expect(clock(back.start)).toBe('22:30');
  });
});

describe('the plan around nights', () => {
  const plan = planBetween('2026-10-05', '2026-10-08', nights, defaultRhythm);
  const of = (kind: string) => plan.filter((entry) => entry.kind === kind);

  it('naps before the first night only', () => {
    const naps = of('nap');
    expect(naps).toHaveLength(1);
    expect(naps[0].start.getDate()).toBe(5);
    expect(clock(naps[0].start)).toBe('16:00');
    expect(clock(naps[0].end!)).toBe('17:30');
  });

  it('puts bright light in the first half and sunglasses on the way home, except after the last night', () => {
    expect(of('light').filter((entry) => entry.title === 'Bright light').map((entry) => clock(entry.end!))).toEqual(['01:00', '01:00', '01:00']);
    expect(of('dark')).toHaveLength(2);
  });

  it('keeps meals in the day and small snacks overnight', () => {
    expect(of('light-food').map((entry) => `${clock(entry.start)}-${clock(entry.end!)}`)).toEqual(['00:00-06:00', '00:00-06:00', '00:00-06:00']);
    expect(of('meal').filter((entry) => entry.title === 'Main meal').map((entry) => clock(entry.start))).toEqual(['17:45', '17:45', '17:45']);
  });

  it('stops caffeine six hours before each sleep', () => {
    const lastNight = of('caffeine').find((entry) => entry.start.getDate() === 6);
    expect(lastNight && clock(lastNight.start)).toBe('01:30');
  });

  it('cites a source on every suggestion', () => {
    expect(plan.filter((entry) => !['work', 'wake'].includes(entry.kind)).every((entry) => entry.source)).toBe(true);
  });

  it('groups by the day each belongs to', () => {
    const day = entriesOn('2026-10-09', plan);
    expect(day.every((entry) => entry.start.getDate() === 9)).toBe(true);
  });

  it('leaves out light and meals when turned off', () => {
    const plain = planBetween('2026-10-05', '2026-10-08', nights, { ...defaultRhythm, light: false, meals: false });
    expect(plain.some((entry) => ['light', 'dark', 'meal', 'light-food'].includes(entry.kind))).toBe(false);
  });
});

describe('the sleep log', () => {
  it('counts hours across midnight', () => {
    expect(sleptMinutes({ bed: '23:00', up: '07:00' })).toBe(480);
    expect(sleptMinutes({ bed: '08:00', up: '15:30' })).toBe(450);
  });

  it('gives facts, not a score', () => {
    expect(sleepFacts([])).toBeUndefined();
    expect(sleepFacts([{ date: '2026-10-01', bed: '23:00', up: '07:00', how: 'well' }, { date: '2026-10-02', bed: '23:00', up: '06:00' }])).toEqual({
      nights: 2,
      averageMinutes: 450,
      marked: { well: 1, okay: 0, poorly: 0 },
    });
  });

  it('offers the planned times for the check-in', () => {
    const plan = planBetween('2026-10-09', '2026-10-10', [], defaultRhythm);
    expect(plannedSleepInto('2026-10-10', plan)).toEqual({ bed: '22:30', up: '06:00' });
  });
});
