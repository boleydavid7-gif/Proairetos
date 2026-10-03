import { addDays } from '../../core/scheduling/dates';
import type { LogEntry } from '../../askesis/core/log';
import { buildPath, weekAt, weekMinutes } from '../../askesis/core/plans';
import { howItFelt, longestSession, runDays, suggestWeek, thenAndNow, weeksToAim } from '../../askesis/core/progress';

const monday = '2026-10-12';
const plan = buildPath({ aim: { kind: 'distance', meters: 10000 }, days: 3 });
let n = 0;
const run = (daysBack: number, minutes: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id: `e${(n += 1)}`,
  date: addDays(monday, -daysBack),
  activity: 'run',
  seconds: minutes * 60,
  createdAt: '2026-10-01T00:00:00Z',
  ...extra,
});
/** Logs every session of a plan week, in the week before `monday`. */
const didWeek = (week: number, scale = 1): LogEntry[] =>
  weekAt(plan, week).workouts.map((w, i) => run(7 - i * 2, Math.round((weekMinutes(weekAt(plan, week)) / weekAt(plan, week).workouts.length) * scale), { workoutId: w.id }));

describe('suggesting the next week from the log', () => {
  it('keeps the week when nothing was logged', () => {
    expect(suggestWeek(plan, 5, [], monday)).toMatchObject({ week: 5, why: 'quiet' });
  });

  it('moves through the walk-run weeks by sessions done', () => {
    expect(suggestWeek(plan, 3, didWeek(3), monday)).toMatchObject({ week: 4, why: 'next' });
    const one = didWeek(3).slice(0, 1);
    expect(suggestWeek(plan, 3, one, monday)).toMatchObject({ week: 3, why: 'again' });
  });

  it('offers the week again after two hard runs', () => {
    const hard = didWeek(12).map((e, i) => (i < 2 ? { ...e, felt: 'hard' as const } : e));
    expect(suggestWeek(plan, 12, hard, monday)).toMatchObject({ week: 12, why: 'again' });
  });

  it('suggests the next week when the week was run as written', () => {
    expect(suggestWeek(plan, 12, didWeek(12), monday)).toMatchObject({ week: 13, why: 'next' });
  });

  it('carries someone ahead when they ran more, within about 10% and 10 minutes of long run', () => {
    const lots = [...didWeek(12, 1.6), run(10, 60), run(16, 60)];
    const s = suggestWeek(plan, 12, lots, monday);
    expect(s.why).toBe('ahead');
    const week = weekAt(plan, s.week);
    expect(week.easier).toBe(false);
    expect(['Base', 'Build', 'Hold']).toContain(week.stage);
    expect(weekMinutes(week)).toBeLessThanOrEqual(s.reading.busiest * 1.1 + 5);
    expect(longestSession(week)).toBeLessThanOrEqual(s.reading.longest + 10);
    expect(weeksToAim(plan, s.week)).toBeLessThan(weeksToAim(plan, 13)!);
  });

  it('does not carry someone ahead on an earlier busy week when last week was light', () => {
    const entries = [run(16, 120), run(15, 120), run(5, 20)];
    expect(suggestWeek(plan, 12, entries, monday)).toMatchObject({ week: 12, why: 'again' });
  });

  it('suggests an earlier week when the running was much less than the week asked', () => {
    const little = didWeek(16, 0.4);
    const s = suggestWeek(plan, 16, little, monday);
    expect(s.why).toBe('earlier');
    expect(s.week).toBeLessThan(16);
    expect(s.week).toBeGreaterThanOrEqual(11);
  });
});

describe('then and now', () => {
  it('waits for four weeks between the first runs and the last three weeks', () => {
    expect(thenAndNow([run(10, 20)], monday)).toBeUndefined();
  });
  it('sets the first two weeks beside the last three', () => {
    const entries = [run(60, 10), run(57, 15), run(53, 20), run(15, 40), run(8, 45), run(3, 50)];
    expect(thenAndNow(entries, monday)).toEqual({ then: { weekly: 23, longest: 20 }, now: { weekly: 45, longest: 50 } });
  });
});

describe('the runner’s own record', () => {
  it('counts the days with a run since the first one', () => {
    expect(runDays([])).toBeUndefined();
    expect(runDays([run(30, 20), run(30, 10), run(2, 30), { ...run(1, 60), activity: 'bike' }])).toEqual({ days: 2, since: addDays(monday, -30) });
  });
  it('counts how runs felt, only as marked', () => {
    const entries = [run(2, 30, { felt: 'good' }), run(4, 30, { felt: 'easy' }), run(6, 30, { felt: 'hard' }), run(8, 30), run(40, 30, { felt: 'hard' })];
    expect(howItFelt(entries, monday)).toEqual({ good: 2, challenging: 0, hard: 1 });
    expect(howItFelt([run(2, 30)], monday)).toBeUndefined();
  });
});
