import type { LifeItem } from '../../core/life-items/types';
import { daysAway, fromEarlierDays, occurrenceKey, pauseOffer, readyToCheckBack } from '../../core/rhythm/rhythm';
import type { ScheduleOccurrence, SchedulePattern } from '../../core/scheduling/types';

const item = (id: string, fields: Partial<LifeItem>): LifeItem => ({
  id,
  userId: 'u',
  type: 'DO',
  title: id,
  status: 'OPEN',
  important: false,
  source: 'MANUAL',
  carried: false,
  createdAt: '',
  updatedAt: '',
  ...fields,
});

const now = new Date(2026, 9, 10, 15, 0);

describe('time away', () => {
  it('counts calendar days, not hours', () => {
    expect(daysAway(new Date(2026, 9, 9, 23, 0), now)).toBe(1);
    expect(daysAway(new Date(2026, 9, 5, 8, 0), now)).toBe(5);
    expect(daysAway(null, now)).toBe(0);
  });

  it('gathers open items from earlier days, oldest first', () => {
    const items = [
      item('today', { scheduledAt: new Date(2026, 9, 10, 9).toISOString() }),
      item('tuesday', { scheduledAt: new Date(2026, 9, 6, 9).toISOString() }),
      item('monday', { scheduledAt: new Date(2026, 9, 5, 9).toISOString() }),
      item('finished', { scheduledAt: new Date(2026, 9, 5, 9).toISOString(), status: 'DONE' }),
    ];
    expect(fromEarlierDays(items, now).map((i) => i.id)).toEqual(['monday', 'tuesday']);
  });
});

describe('check-back nudges', () => {
  it('brings back waiting items whose chosen day has come', () => {
    const items = [
      item('due today', { status: 'WAITING', checkBackAt: new Date(2026, 9, 10).toISOString() }),
      item('due earlier', { status: 'WAITING', checkBackAt: new Date(2026, 9, 8).toISOString() }),
      item('not yet', { status: 'WAITING', checkBackAt: new Date(2026, 9, 11).toISOString() }),
      item('no date', { status: 'WAITING' }),
    ];
    expect(readyToCheckBack(items, now).map((i) => i.id)).toEqual(['due earlier', 'due today']);
  });
});

describe('pause offers', () => {
  const pattern = (pauseWhenEnds: boolean): SchedulePattern => ({
    id: 'work',
    userId: 'u',
    name: 'Work',
    kind: 'COMMITTED',
    layout: 'CYCLE',
    anchorDate: '2026-10-01',
    segments: [],
    pauseWhenEnds,
    createdAt: '',
    updatedAt: '',
  });
  const shift = (endHour: number, endMinute = 0): ScheduleOccurrence => ({
    patternId: 'work',
    patternName: 'Work',
    kind: 'COMMITTED',
    date: '2026-10-10',
    start: new Date(2026, 9, 10, 6, 30),
    end: new Date(2026, 9, 10, endHour, endMinute),
    changed: false,
  });

  it('offers a pause shortly after a chosen block ends', () => {
    expect(pauseOffer(now, [shift(14, 30)], [pattern(true)], new Set())).toBeDefined();
  });

  it('stays quiet when not chosen, too late, still going, or already answered', () => {
    expect(pauseOffer(now, [shift(14, 30)], [pattern(false)], new Set())).toBeUndefined();
    expect(pauseOffer(now, [shift(13, 0)], [pattern(true)], new Set())).toBeUndefined();
    expect(pauseOffer(now, [shift(16, 0)], [pattern(true)], new Set())).toBeUndefined();
    const ended = shift(14, 30);
    expect(pauseOffer(now, [ended], [pattern(true)], new Set([occurrenceKey(ended)]))).toBeUndefined();
  });
});
