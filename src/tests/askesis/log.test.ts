import { periodRange, totalsBetween, weeklyTotals, type LogEntry } from '../../askesis/core/log';
import { formatDuration, formatPace, paceOf, parseDistance, parseDuration } from '../../askesis/core/pace';
import { layOut, nightNote } from '../../askesis/core/week';
import { buildPlan } from '../../askesis/core/plans';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const entry = (date: string, meters: number, seconds: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id: `${date}-${meters}`,
  date,
  activity: 'run',
  meters,
  seconds,
  createdAt: `${date}T10:00:00Z`,
  ...extra,
});

describe('pace and time', () => {
  it('reads times the way people type them', () => {
    expect(parseDuration('26:14')).toBe(1574);
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('30')).toBe(1800);
    expect(parseDuration('26:75')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('works out pace from time and distance', () => {
    const meters = parseDistance('3.1', 'mi')!;
    expect(formatPace(paceOf(1800, meters, 'mi')!, 'mi')).toBe('9:41 /mi');
    expect(formatPace(paceOf(1500, 5000, 'km')!, 'km')).toBe('5:00 /km');
    expect(parseDistance('abc', 'km')).toBeUndefined();
  });
});

describe('the log', () => {
  const entries = [entry('2026-09-28', 3000, 1200), entry('2026-09-30', 5000, 1800), entry('2026-09-21', 4000, 1500)];

  it('totals a week from Monday to Sunday, and the week before', () => {
    const range = periodRange('week', '2026-10-02');
    expect(range).toMatchObject({ from: '2026-09-28', to: '2026-10-04' });
    expect(totalsBetween(entries, range.from, range.to)).toMatchObject({ count: 2, meters: 8000, seconds: 3000, longestMeters: 5000 });
    expect(totalsBetween(entries, range.before!.from, range.before!.to).count).toBe(1);
  });

  it('gives one plain total per week, oldest first', () => {
    const weeks = weeklyTotals(entries, 3, '2026-10-02');
    expect(weeks.map((week) => week.meters)).toEqual([0, 4000, 8000]);
  });

  it('months and years follow the calendar', () => {
    expect(periodRange('month', '2026-02-10')).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('year', '2026-02-10').before).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });
});

describe('laying a plan week over the calendar', () => {
  const plan = buildPlan({ level: 'intermediate', days: 3 });

  it('puts sessions on the chosen weekdays and honours a move', () => {
    const week = plan.weeks[0];
    const days = layOut(week, '2026-10-02', [1, 3, 5], {}, []);
    expect(days.map((day) => day.date)).toEqual(['2026-09-29', '2026-10-01', '2026-10-03']);
    const moved = layOut(week, '2026-10-02', [1, 3, 5], { [week.workouts[0].id]: '2026-10-02' }, []);
    expect(moved.map((day) => day.date)).toContain('2026-10-02');
  });

  it('marks a day that follows a night of work', () => {
    const night: ScheduleOccurrence = {
      patternId: 'p',
      patternName: 'Work',
      kind: 'COMMITTED',
      date: '2026-10-02',
      start: new Date(2026, 9, 2, 22),
      end: new Date(2026, 9, 3, 7),
      changed: false,
    };
    expect(nightNote('2026-10-03', [night])).toBeTruthy();
    expect(nightNote('2026-10-02', [night])).toBeUndefined();
    expect(nightNote('2026-10-03', [{ ...night, kind: 'PROTECTED' }])).toBeUndefined();
  });
});
