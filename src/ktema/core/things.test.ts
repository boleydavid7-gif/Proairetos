import { describe, expect, it } from 'vitest';
import { atTime } from '../../core/scheduling/dates';
import { addMonths, dayText, everyText, grouped, markDone, nextDue, perDay, search, skip, warrantiesEnding, warrantyText, type Thing, type Upkeep } from './things';
import { defaultUpkeepNotices, upkeepNotices } from './notices';

const upkeep = (patch: Partial<Upkeep> = {}): Upkeep => ({ id: 'u1', name: 'Air filter', every: { count: 3, unit: 'months' }, start: '2026-10-01', history: [], createdAt: '', ...patch });
const car = (readings: Thing['readings']): Thing => ({ id: 'car', name: 'Car', category: 'Car', readings, createdAt: '' });

describe('when upkeep comes round', () => {
  it('counts months from when it was last done, keeping to the end of short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(nextDue(upkeep()).date).toBe('2026-10-01');
    expect(nextDue(markDone(upkeep(), '2026-10-12')).date).toBe('2027-01-12');
    expect(nextDue(skip(upkeep(), '2026-10-05')).date).toBe('2027-01-05');
  });

  it('comes round by distance when that is sooner, estimated from the readings', () => {
    const oil = markDone(upkeep({ name: 'Oil change', every: { count: 6, unit: 'months' }, distance: 5000, thingId: 'car' }), '2026-06-01', { reading: 40000 });
    // 1,500 a month: 5,000 more comes before six months.
    const driven = car([{ date: '2026-06-01', value: 40000 }, { date: '2026-08-30', value: 44500 }]);
    expect(perDay(driven)).toBeCloseTo(50, 0);
    const due = nextDue(oil, driven);
    expect(due.byDistance).toBe(true);
    expect(due.reading).toBe(45000);
    expect(due.date).toBe('2026-09-09');
    // Driven little: six months comes first.
    expect(nextDue(oil, car([{ date: '2026-06-01', value: 40000 }, { date: '2026-08-30', value: 41000 }])).date).toBe('2026-12-01');
    // Already past the distance: due from that reading's day.
    expect(nextDue(oil, car([{ date: '2026-06-01', value: 40000 }, { date: '2026-08-20', value: 45200 }])).date).toBe('2026-08-20');
  });

  it('groups by now, the next 30 days and later, and words days without blame', () => {
    const list = [upkeep({ id: 'a', start: '2026-10-01' }), upkeep({ id: 'b', start: '2026-10-20' }), upkeep({ id: 'c', start: '2027-01-01' })];
    const groups = grouped(list, [], '2026-10-11');
    expect([groups.now, groups.soon, groups.later].map((group) => group.length)).toEqual([1, 1, 1]);
    expect(dayText('2026-10-01', '2026-10-11')).toMatch(/^Since /);
    expect(dayText('2026-10-12', '2026-10-11')).toBe('Tomorrow');
    expect(everyText({ count: 1, unit: 'years' })).toBe('Every year');
    expect(everyText({ count: 3, unit: 'months' })).toBe('Every 3 months');
  });
});

describe('things', () => {
  const things: Thing[] = [
    { id: 't1', name: 'Dishwasher', category: 'Appliance', make: 'Bosch', model: 'SMS2', place: 'Kitchen', warrantyUntil: '2026-11-20', createdAt: '' },
    { id: 't2', name: 'Laptop', category: 'Tech', warrantyUntil: '2025-03-01', createdAt: '' },
  ];
  it('says warranties plainly and lists those ending soon', () => {
    expect(warrantyText(things[0], '2026-10-11')).toMatch(/^Warranty until/);
    expect(warrantyText(things[1], '2026-10-11')).toMatch(/^Warranty ended/);
    expect(warrantiesEnding(things, '2026-10-11').map((thing) => thing.id)).toEqual(['t1']);
  });

  it('finds things by every word', () => {
    expect(search(things, 'bosch kitchen').map((thing) => thing.id)).toEqual(['t1']);
    expect(search(things, '')).toHaveLength(2);
  });
});

describe('notices', () => {
  it('names the day’s upkeep in one notice and says a warranty a month before it ends', () => {
    const list = [upkeep({ id: 'a', name: 'Air filter', start: '2026-10-13' }), upkeep({ id: 'b', name: 'Gutters', start: '2026-10-13' })];
    const things: Thing[] = [{ id: 't1', name: 'Dishwasher', category: 'Appliance', warrantyUntil: '2026-11-12', createdAt: '' }];
    const notices = upkeepNotices(list, things, defaultUpkeepNotices, '2026-10-11', 14, atTime('2026-10-11', '08:00'));
    expect(notices.map((notice) => notice.title).sort()).toEqual(['2 things to look after', 'Dishwasher']);
  });
});

describe('documents', () => {
  it('says a document runs until a date, not a warranty', () => {
    const passport: Thing = { id: 'p', name: 'Passport', category: 'Documents', warrantyUntil: '2030-05-01', createdAt: '' };
    expect(warrantyText(passport, '2026-10-11')).toMatch(/^Until /);
  });
});
