import { addDays, mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';

/**
 * What the person wrote down after a workout. Everything but the date is
 * optional; nothing is measured or inferred by the app.
 */
export type Activity = 'run' | 'walk' | 'hike' | 'bike' | 'other';
export type Felt = 'easy' | 'good' | 'challenging' | 'hard';

export type LogEntry = {
  id: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  activity: Activity;
  seconds?: number;
  meters?: number;
  avgHr?: number;
  felt?: Felt;
  notes?: string;
  wentWell?: string;
  nextTime?: string;
  /** What the person chose to hold to before starting, if they wrote anything. */
  intention?: string;
  /** The plan session this was, if any. */
  workoutId?: string;
  workoutTitle?: string;
  createdAt: string;
};

export const activities: Record<Activity, string> = {
  run: 'Run',
  walk: 'Walk',
  hike: 'Hike',
  bike: 'Bike',
  other: 'Other',
};

export const feelings: Record<Felt, string> = {
  easy: 'Easy',
  good: 'Good',
  challenging: 'Challenging',
  hard: 'Hard',
};

export type Period = 'week' | 'month' | 'year' | 'all';

/** [first, last] local dates of the period containing `today`, and of the one before it. */
export function periodRange(period: Period, today: string): { from: string; to: string; before?: { from: string; to: string } } {
  if (period === 'week') {
    const from = mondayOnOrBefore(today);
    return { from, to: addDays(from, 6), before: { from: addDays(from, -7), to: addDays(from, -1) } };
  }
  if (period === 'month') {
    const [y, m] = today.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const to = toLocalDate(new Date(y, m, 0));
    const beforeFrom = toLocalDate(new Date(y, m - 2, 1));
    return { from, to, before: { from: beforeFrom, to: addDays(from, -1) } };
  }
  if (period === 'year') {
    const y = Number(today.slice(0, 4));
    return { from: `${y}-01-01`, to: `${y}-12-31`, before: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` } };
  }
  return { from: '0000-01-01', to: '9999-12-31' };
}

export type Totals = { count: number; seconds: number; meters: number; longestMeters: number; longestSeconds: number };

export function totalsBetween(entries: readonly LogEntry[], from: string, to: string): Totals {
  const inside = entries.filter((entry) => entry.date >= from && entry.date <= to);
  return {
    count: inside.length,
    seconds: inside.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0),
    meters: inside.reduce((sum, entry) => sum + (entry.meters ?? 0), 0),
    longestMeters: Math.max(0, ...inside.map((entry) => entry.meters ?? 0)),
    longestSeconds: Math.max(0, ...inside.map((entry) => entry.seconds ?? 0)),
  };
}

/** One bar per week, oldest first: what was recorded, nothing more. */
export function weeklyTotals(entries: readonly LogEntry[], weeks: number, today: string) {
  const thisMonday = mondayOnOrBefore(today);
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(thisMonday, -7 * (weeks - 1 - i));
    return { from, ...totalsBetween(entries, from, addDays(from, 6)) };
  });
}

export const newestFirst = (a: LogEntry, b: LogEntry) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
