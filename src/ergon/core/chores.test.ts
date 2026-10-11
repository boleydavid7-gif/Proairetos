import { describe, expect, it } from 'vitest';
import { dayText, grouped, markDone, namesIn, nextDay, repeatText, skip, whoDidWhat, type Chore } from './chores';
import { choreNotices, defaultChoreNotices } from './notices';

const chore = (patch: Partial<Chore>): Chore => ({ id: 'c', name: 'Vacuum', repeat: { kind: 'weeks', every: 1 }, history: [], createdAt: '2026-10-01T10:00:00', ...patch });

describe('next day', () => {
  it('starts on the chosen day, or the day it was added', () => {
    expect(nextDay(chore({}))).toBe('2026-10-01');
    expect(nextDay(chore({ start: '2026-10-12' }))).toBe('2026-10-12');
  });

  it('counts from when it was last done', () => {
    expect(nextDay(chore({ history: [{ date: '2026-10-05' }] }))).toBe('2026-10-12');
    expect(nextDay(chore({ repeat: { kind: 'days', every: 3 }, history: [{ date: '2026-10-05' }, { date: '2026-10-02' }] }))).toBe('2026-10-08');
  });

  it('keeps to chosen weekdays', () => {
    // 2026-10-05 is a Monday; Monday and Thursday.
    const twice = chore({ repeat: { kind: 'weekdays', days: [1, 4] }, history: [{ date: '2026-10-05' }] });
    expect(nextDay(twice)).toBe('2026-10-08');
    expect(nextDay(chore({ repeat: { kind: 'weekdays', days: [1] }, start: '2026-10-06' }))).toBe('2026-10-12');
  });

  it('keeps to a day of the month, the last day in short months', () => {
    expect(nextDay(chore({ repeat: { kind: 'monthly', day: 15 }, history: [{ date: '2026-10-15' }] }))).toBe('2026-11-15');
    expect(nextDay(chore({ repeat: { kind: 'monthly', day: 31 }, history: [{ date: '2026-10-31' }] }))).toBe('2026-11-30');
    expect(nextDay(chore({ repeat: { kind: 'monthly', day: 1 }, start: '2026-10-10' }))).toBe('2026-11-01');
  });

  it('drops a one-off once done', () => {
    expect(nextDay(chore({ repeat: { kind: 'once' }, start: '2026-10-11' }))).toBe('2026-10-11');
    expect(nextDay(chore({ repeat: { kind: 'once' }, history: [{ date: '2026-10-11' }] }))).toBeUndefined();
  });

  it('done late comes round once, a full interval later', () => {
    const late = markDone(chore({ history: [{ date: '2026-09-20' }] }), '2026-10-10');
    expect(nextDay(late)).toBe('2026-10-17');
  });

  it('skipping counts from today without recording it as done', () => {
    const skipped = skip(chore({ history: [{ date: '2026-09-20' }] }), '2026-10-10');
    expect(nextDay(skipped)).toBe('2026-10-17');
    expect(skipped.history).toHaveLength(1);
  });
});

describe('who', () => {
  it('passes a rota on in turn', () => {
    let rota = chore({ rota: ['Ana', 'Ben', 'Cy'], who: 'Ana' });
    rota = markDone(rota, '2026-10-10');
    expect(rota.who).toBe('Ben');
    expect(rota.history.at(-1)).toEqual({ date: '2026-10-10', by: 'Ana' });
    rota = markDone(markDone(rota, '2026-10-17'), '2026-10-24');
    expect(rota.who).toBe('Ana');
  });

  it('counts plainly who did what in the last 30 days', () => {
    const chores = [chore({ history: [{ date: '2026-10-01', by: 'Ana' }, { date: '2026-08-01', by: 'Ana' }] }), chore({ id: 'd', history: [{ date: '2026-10-09', by: 'Ben' }] })];
    expect(whoDidWhat(chores, '2026-10-10')).toEqual([{ name: 'Ana', times: 1 }, { name: 'Ben', times: 1 }]);
    expect(namesIn([chore({ who: 'Cy', rota: ['Cy', 'Ana'] })], ['Ben'])).toEqual(['Ana', 'Ben', 'Cy']);
  });
});

describe('showing them', () => {
  it('groups by now, this week and later', () => {
    const list = [
      chore({ id: 'a', name: 'A', history: [{ date: '2026-10-01' }] }),
      chore({ id: 'b', name: 'B', start: '2026-10-13' }),
      chore({ id: 'c', name: 'C', start: '2026-11-01' }),
      chore({ id: 'd', name: 'D', repeat: { kind: 'once' }, history: [{ date: '2026-10-01' }] }),
    ];
    const groups = grouped(list, '2026-10-10');
    expect([groups.now, groups.week, groups.later].map((group) => group.map((each) => each.name))).toEqual([['A'], ['B'], ['C']]);
  });

  it('never calls a day late', () => {
    expect(dayText('2026-10-10', '2026-10-10')).toBe('Today');
    expect(dayText('2026-10-09', '2026-10-10')).toBe('Since yesterday');
    expect(dayText('2026-10-11', '2026-10-10')).toBe('Tomorrow');
    expect(dayText('2026-10-07', '2026-10-10')).toMatch(/^Since /);
  });

  it('says the repeat plainly', () => {
    expect(repeatText({ kind: 'weeks', every: 2 })).toBe('Every 2 weeks');
    expect(repeatText({ kind: 'monthly', day: 2 })).toBe('Monthly on the 2nd');
    expect(repeatText({ kind: 'monthly', day: 31 })).toBe('Last day of the month');
  });
});

describe('notices', () => {
  it('names the chores of each day once, from today on', () => {
    const list = [chore({ id: 'a', name: 'Bins out', start: '2026-10-12' }), chore({ id: 'b', name: 'Vacuum', start: '2026-10-12' }), chore({ id: 'c', name: 'Old', start: '2026-10-01' })];
    const notices = choreNotices(list, defaultChoreNotices, undefined, '2026-10-10', 14);
    expect(notices.map((n) => [n.title, n.body, n.at.getDate()])).toEqual([['2 chores', 'Bins out, Vacuum', 12]]);
  });

  it('says a chore with its own time at that time', () => {
    const list = [chore({ id: 'a', name: 'Bins out', start: '2026-10-12', remindAt: '19:00' }), chore({ id: 'b', name: 'Vacuum', start: '2026-10-12' })];
    const notices = choreNotices(list, defaultChoreNotices, undefined, '2026-10-10', 14);
    expect(notices.map((n) => [n.title, n.at.getHours()]).sort()).toEqual([['Bins out', 19], ['Vacuum', 9]]);
  });

  it('can keep to one person', () => {
    const list = [chore({ id: 'a', name: 'Bins out', start: '2026-10-12', who: 'Ana' }), chore({ id: 'b', name: 'Vacuum', start: '2026-10-12', who: 'Ben' })];
    const notices = choreNotices(list, { ...defaultChoreNotices, onlyMine: true }, 'Ana', '2026-10-10', 14);
    expect(notices.map((n) => n.title)).toEqual(['Bins out']);
  });
});
