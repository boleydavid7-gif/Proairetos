import { addDays } from '../../core/scheduling/dates';
import type { LogEntry } from './log';
import { buildPath, firstAfterStart, fromWeek, lastWeekOf, matchingWeek, ownPath, weekAt, weekMinutes, type OwnPath, type Plan, type PlanWeek } from './plans';
import { totalMinutes } from './workouts';

/**
 * Where the runner is, read from what they logged, and the week that fits it.
 * The plan suggests; the person chooses. Growth stays within the science:
 * a suggested week asks at most about 10% more time than the busiest of the
 * last three weeks, and a long run no more than 10 minutes past the longest
 * one logged.
 */
export type Reading = {
  /** Running minutes logged last week (runs, and plan sessions of any kind). */
  lastWeek: number;
  /** The busiest of the last three weeks, in minutes. */
  busiest: number;
  /** The longest single run in the last three weeks, in minutes. */
  longest: number;
  /** The longest single run last week, in minutes. */
  lastLongest: number;
  /** Plan sessions logged last week, and how many the week had. */
  sessionsDone: number;
  sessions: number;
  /** Runs last week that felt hard. */
  hard: number;
};

export type Why = 'next' | 'ahead' | 'again' | 'earlier' | 'quiet';

export type Suggestion = {
  week: number;
  why: Why;
  reading: Reading;
};

const counts = (entry: LogEntry) => entry.activity === 'run' || Boolean(entry.workoutId);
const minutesIn = (entries: readonly LogEntry[], from: string, to: string) =>
  entries.filter((e) => counts(e) && e.date >= from && e.date <= to).reduce((sum, e) => sum + (e.seconds ?? 0) / 60, 0);

/** The longest session in a plan week, in minutes. */
export function longestSession(week: PlanWeek): number {
  return Math.max(0, ...week.workouts.map((workout) => totalMinutes(workout.parts)));
}

export function readLog(entries: readonly LogEntry[], week: PlanWeek, monday: string): Reading {
  const lastFrom = addDays(monday, -7);
  const lastTo = addDays(monday, -1);
  const weeks = [0, 1, 2].map((i) => minutesIn(entries, addDays(lastFrom, -7 * i), addDays(lastTo, -7 * i)));
  const recent = entries.filter((e) => counts(e) && e.date >= addDays(lastFrom, -14) && e.date <= lastTo);
  const last = entries.filter((e) => e.date >= lastFrom && e.date <= lastTo);
  const ids = new Set(week.workouts.map((workout) => workout.id));
  return {
    lastWeek: Math.round(weeks[0]),
    busiest: Math.round(Math.max(...weeks)),
    longest: Math.round(Math.max(0, ...recent.map((e) => (e.seconds ?? 0) / 60))),
    lastLongest: Math.round(Math.max(0, ...last.filter(counts).map((e) => (e.seconds ?? 0) / 60))),
    sessionsDone: new Set(last.filter((e) => e.workoutId && ids.has(e.workoutId)).map((e) => e.workoutId)).size,
    sessions: week.workouts.filter((workout) => workout.kind !== 'walk').length || week.workouts.length,
    hard: last.filter((e) => e.felt === 'hard').length,
  };
}

/** Weeks that only grow time: a reading can carry someone ahead through these, never into the sharpening at the end. */
const growing = (week: PlanWeek) => week.stage === 'Base' || week.stage === 'Build' || week.stage === 'Hold' || week.stage === 'Keep going';

/** Whether a week fits what was logged: time within about 10% of the busiest recent week, long run within 10 minutes of the longest. */
function fits(week: PlanWeek, reading: Reading): boolean {
  return weekMinutes(week) <= reading.busiest * 1.1 + 5 && longestSession(week) <= reading.longest + 10;
}

/**
 * The week that fits where the runner is, for the week starting `monday`.
 * `current` is the week just run.
 */
export function suggestWeek(plan: Plan, current: number, entries: readonly LogEntry[], monday: string): Suggestion {
  const week = weekAt(plan, current);
  const reading = readLog(entries, week, monday);
  const last = plan.cycleFrom ? Number.POSITIVE_INFINITY : lastWeekOf(plan);
  const next = Math.min(last, current + 1);
  const logged = reading.lastWeek > 0 || reading.sessionsDone > 0;

  if (!logged) return { week: current, why: 'quiet', reading };
  if (reading.hard >= 2) return { week: current, why: 'again', reading };

  // The walk-run weeks go by sessions: most of the week done, then the next.
  if (week.stage === 'Start') {
    if (reading.sessionsDone >= reading.sessions - 1 || reading.lastWeek >= weekMinutes(week) * 0.9) return { week: next, why: 'next', reading };
    return { week: current, why: 'again', reading };
  }

  // Ran clearly less than the week asked: the week again, or, when the last three weeks were all lighter, the furthest earlier week that fits.
  const asked = weekMinutes(week);
  if (reading.lastWeek < asked * 0.7) {
    if (reading.busiest >= asked * 0.7) return { week: current, why: 'again', reading };
    let earlier = current;
    const floor = Math.max(plan.weeks[0]?.n ?? 1, firstAfterStart(plan));
    for (let n = current - 1; n >= floor; n -= 1) {
      earlier = n;
      if (fits(weekAt(plan, n), reading)) break;
    }
    if (earlier < current) return { week: earlier, why: 'earlier', reading };
    return { week: current, why: 'again', reading };
  }
  if (reading.lastWeek <= asked * 1.1) return { week: next, why: 'next', reading };

  // Ran more than the week asked: the furthest growing week that still fits, past the next.
  let ahead = next;
  if (Number.isFinite(last)) {
    for (let n = next + 1; n <= last; n += 1) {
      const candidate = weekAt(plan, n);
      if (!growing(candidate) || !fits(candidate, reading)) break;
      // Never land on an easier week by reading ahead; they come round in their turn.
      if (!candidate.easier) ahead = n;
    }
  }
  if (ahead > next) return { week: ahead, why: 'ahead', reading };
  return { week: next, why: 'next', reading };
}

/** Weeks from a week to the aim, counting that week; undefined on a path that goes round. */
export function weeksToAim(plan: Plan, week: number): number | undefined {
  if (plan.cycleFrom) return undefined;
  return Math.max(1, lastWeekOf(plan) - week + 1);
}

/**
 * When a week has been taken again (or two runs felt hard), the rest of the
 * path can go more gradually: the bigger walk-run steps twice, slower growth
 * after. The runner keeps their week number; the path under it changes.
 * Not with a date, which fixes how many weeks there are.
 */
export function moreGradual(state: OwnPath & { week: number }): { joinWeek: number; addedWeeks?: number } | undefined {
  if (state.gentler || state.raceDate) return undefined;
  const now = ownPath(state);
  const natural = buildPath({ aim: state.aim, days: state.days, gentler: true, walkFirst: state.walkFirst });
  const joinWeek = matchingWeek(weekAt(now, state.week), natural) - state.week + 1;
  const after = fromWeek(natural, joinWeek);
  if (now.cycleFrom || after.cycleFrom) return { joinWeek };
  return { joinWeek, addedWeeks: Math.max(0, lastWeekOf(after) - lastWeekOf(now)) };
}

/** What each stage builds in the body, in plain words, for the moment a week is chosen. */
export const stageBuilds: Record<PlanWeek['stage'], string> = {
  Start: 'Heart, lungs and legs get used to running, and tendons get time to catch up.',
  Base: 'Easy time grows the small blood vessels and energy stores that make running feel easier.',
  Build: 'Longer runs teach the body to keep going: more fuel stored, more of it from fat.',
  Hold: 'Keeping what you built while the date comes.',
  Shape: 'Faster sessions lift the pace you can hold.',
  Taper: 'Less running lets the body take in the work, so you arrive fresh.',
  'Your aim': 'The week it comes together.',
  'Keep going': 'Steady running keeps heart, mood and sleep in good shape.',
};

export type Stretch = { weekly: number; longest: number };

/**
 * The runner's own change, from the log: their first two weeks of running
 * beside their last three. Only once there are four weeks between them.
 */
export function thenAndNow(entries: readonly LogEntry[], today: string): { then: Stretch; now: Stretch } | undefined {
  const runs = entries.filter(counts).filter((e) => (e.seconds ?? 0) > 0);
  if (runs.length === 0) return undefined;
  const first = runs.reduce((min, e) => (e.date < min ? e.date : min), runs[0].date);
  const nowFrom = addDays(today, -20);
  if (addDays(first, 28) > nowFrom) return undefined;
  const stretch = (from: string, to: string, weeks: number): Stretch => {
    const inside = runs.filter((e) => e.date >= from && e.date <= to);
    return {
      weekly: Math.round(inside.reduce((sum, e) => sum + (e.seconds ?? 0) / 60, 0) / weeks),
      longest: Math.round(Math.max(0, ...inside.map((e) => (e.seconds ?? 0) / 60))),
    };
  };
  const now = stretch(nowFrom, today, 3);
  return now.weekly > 0 ? { then: stretch(first, addDays(first, 13), 2), now } : undefined;
}

/** The days with a run on them since the first one logged: who they are becoming, in plain numbers. */
export function runDays(entries: readonly LogEntry[]): { days: number; since: string } | undefined {
  const dates = new Set(entries.filter(counts).map((e) => e.date));
  if (dates.size === 0) return undefined;
  return { days: dates.size, since: [...dates].sort()[0] };
}

/** How runs felt over the last four weeks, as the runner marked them. Nothing is guessed. */
export function howItFelt(entries: readonly LogEntry[], today: string): { good: number; challenging: number; hard: number } | undefined {
  const from = addDays(today, -27);
  const marked = entries.filter((e) => counts(e) && e.felt && e.date >= from && e.date <= today);
  if (marked.length === 0) return undefined;
  return {
    good: marked.filter((e) => e.felt === 'easy' || e.felt === 'good').length,
    challenging: marked.filter((e) => e.felt === 'challenging').length,
    hard: marked.filter((e) => e.felt === 'hard').length,
  };
}
