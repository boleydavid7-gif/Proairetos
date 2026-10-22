import { addDays } from '../scheduling/dates';

/*
 * One training week for runs (Askesis) and strength sessions (Dynamis), laid around the person's work and each other.
 * Both apps work this out from the same facts (the schedule, both plans, what is done), so they agree without
 * asking each other. What keeps sessions apart:
 *  - the same muscle groups get about 48 hours between strength sessions (ACSM 2009, progression models);
 *  - no leg-heavy strength the day before a long or hard run, and hard runs not on back-to-back days
 *    (concurrent training: Wilson et al. 2012; hard-easy pattern, Seiler 2010);
 *  - a run and a strength session share a day only when the run is easy and there is no other room;
 *  - work days are kept free, used when the week needs them, or treated like any day, as the person chooses;
 *    the day after a night shift suits only easy work.
 * Nothing is dropped silently: a session with no fitting day is left unplaced, and passes with the week.
 */

export type WorkDays = 'free' | 'needed' | 'any';
export type RunKind = 'easy' | 'long' | 'hard';
export type FitDay = { date: string; work: boolean; afterNight: boolean };
export type RunToFit = { id: string; run: RunKind; prefer?: string };
export type LiftToFit = { id: string; legs: boolean; prefer?: string };
export type Fixed = { date: string; run?: RunKind; lift?: { legs: boolean } };
export type FitInput = {
  /** The week's days, Monday first. */
  days: FitDay[];
  /** Sessions still to place go on this day or later. */
  from: string;
  /** In the order they are meant to come. */
  runs: RunToFit[];
  lifts: LiftToFit[];
  /** Sessions with a day already: done, moved by hand, or from an app on set weekdays. */
  fixed: Fixed[];
  workDays: WorkDays;
};
export type Fit = { runs: Record<string, string>; lifts: Record<string, string> };

export const FIT_SOURCES = [
  'American College of Sports Medicine, Progression models in resistance training for healthy adults (Med Sci Sports Exerc, 2009)',
  'Wilson et al., Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises (J Strength Cond Res, 2012)',
  'Seiler, What is best practice for training intensity and duration distribution in endurance athletes? (Int J Sports Physiol Perform, 2010)',
];

const UNPLACED = { easy: 30, hard: 35, long: 40, lift: 35 };

/** Every way of choosing between `least` and `most` of `n` days, as bit masks, smallest first. */
function masks(n: number, least: number, most: number): number[] {
  const out: number[] = [];
  for (let mask = 0; mask < 1 << n; mask += 1) {
    let bits = 0;
    for (let at = mask; at; at &= at - 1) bits += 1;
    if (bits >= least && bits <= most) out.push(mask);
  }
  return out;
}

const picked = (mask: number, n: number) => Array.from({ length: n }, (_, at) => at).filter((at) => mask & (1 << at));

/** Which of the runs go when there are fewer days than runs: long first, then hard, then easy in order. */
function chooseRuns(runs: readonly RunToFit[], count: number): RunToFit[] {
  const rank = (run: RunToFit) => (run.run === 'long' ? 0 : run.run === 'hard' ? 1 : 2);
  const kept = new Set([...runs].sort((a, b) => rank(a) - rank(b) || runs.indexOf(a) - runs.indexOf(b)).slice(0, count));
  return runs.filter((run) => kept.has(run));
}

/** The chosen runs in order, and the same with the long run moved to each other place. */
function orders(chosen: readonly RunToFit[]): RunToFit[][] {
  const long = chosen.findIndex((run) => run.run === 'long');
  if (long === -1 || chosen.length < 2) return [[...chosen]];
  const rest = chosen.filter((_, at) => at !== long);
  return Array.from({ length: chosen.length }, (_, at) => [...rest.slice(0, at), chosen[long], ...rest.slice(at)]);
}

/** Counts per day of the week: easy runs, hard runs (long included), long runs, leg strength, other strength. */
type Counts = { easy: Int8Array; hard: Int8Array; long: Int8Array; legs: Int8Array; upper: Int8Array };
const counts = (): Counts => ({ easy: new Int8Array(7), hard: new Int8Array(7), long: new Int8Array(7), legs: new Int8Array(7), upper: new Int8Array(7) });

function add(into: Counts, at: number, run?: RunKind, legs?: boolean): void {
  if (run === 'easy') into.easy[at] += 1;
  else if (run) {
    into.hard[at] += 1;
    if (run === 'long') into.long[at] += 1;
  }
  if (legs === true) into.legs[at] += 1;
  else if (legs === false) into.upper[at] += 1;
}

function cost(c: Counts, days: readonly FitDay[], workDays: WorkDays): number {
  let total = 0;
  for (let at = 0; at < days.length; at += 1) {
    const easy = c.easy[at];
    const hard = c.hard[at];
    const long = c.long[at];
    const lifts = c.legs[at] + c.upper[at];
    if (days[at].work) {
      total += workDays === 'any' ? easy + (hard - long) + long * 2 : easy * 12 + (hard - long) * 20 + long * 25;
      total += lifts * (workDays === 'any' ? 1 : 14);
    }
    if (days[at].afterNight) total += hard * 10 + easy * 2 + lifts * 5;
    if (easy + hard && lifts) total += hard ? 40 : 6;
    if (at + 1 >= days.length) continue;
    const legs = c.legs[at] > 0;
    const nextLegs = c.legs[at + 1] > 0;
    const nextLifts = c.legs[at + 1] + c.upper[at + 1];
    const nextHard = c.hard[at + 1] > 0;
    if (lifts && nextLifts) total += legs && nextLegs ? 12 : legs || nextLegs ? 3 : 1;
    if (legs && nextHard) total += 10;
    if (hard && nextLegs) total += 4;
    if (hard && nextHard) total += 15;
    if (easy + hard && c.easy[at + 1] + c.hard[at + 1]) total += 2;
  }
  return total;
}

/** The best week by the costs above; ties go to the earliest choice, so every app finds the same one. */
export function fitWeek(input: FitInput): Fit {
  const empty: Fit = { runs: {}, lifts: {} };
  if (!input.runs.length && !input.lifts.length) return empty;
  const days = input.days.slice(0, 7);
  const open = days.map((day, at) => ({ ...day, at })).filter((day) => day.date >= input.from && !(input.workDays === 'free' && day.work));
  const n = open.length;
  const base = counts();
  for (const fixed of input.fixed) {
    const at = days.findIndex((day) => day.date === fixed.date);
    if (at !== -1) add(base, at, fixed.run, fixed.lift?.legs);
  }
  const taken = new Set(input.fixed.filter((fixed) => fixed.run).map((fixed) => fixed.date));

  // Leaving out more than two runs or one strength session costs more than any clash, so those choices are not tried.
  const runPlans: { days: number[]; order: RunToFit[]; score: number }[] = [];
  for (const mask of masks(n, Math.max(0, Math.min(input.runs.length, n) - 2), input.runs.length)) {
    const chosen = picked(mask, n).map((at) => open[at]);
    if (chosen.some((day) => taken.has(day.date))) continue;
    const kept = chooseRuns(input.runs, chosen.length);
    const left = input.runs.filter((run) => !kept.includes(run)).reduce((sum, run) => sum + UNPLACED[run.run], 0);
    for (const order of orders(kept)) {
      const prefer = order.reduce((sum, run, at) => sum + (run.prefer && run.prefer !== chosen[at].date ? 2 : 0), 0);
      runPlans.push({ days: chosen.map((day) => day.at), order, score: left + prefer });
    }
  }
  const liftPlans = masks(n, Math.max(0, Math.min(input.lifts.length, n) - 1), input.lifts.length).map((mask) => {
    const chosen = picked(mask, n).map((at) => open[at]);
    const lifts = input.lifts.slice(0, chosen.length);
    const prefer = lifts.reduce((sum, lift, at) => sum + (lift.prefer && lift.prefer !== chosen[at].date ? 2 : 0), 0);
    return { days: chosen.map((day) => day.at), lifts, score: (input.lifts.length - lifts.length) * UNPLACED.lift + prefer };
  });

  const scratch = counts();
  const keys = ['easy', 'hard', 'long', 'legs', 'upper'] as const;
  let best: { score: number; run: (typeof runPlans)[number]; lift: (typeof liftPlans)[number] } | undefined;
  for (const run of runPlans) {
    for (const lift of liftPlans) {
      let score = run.score + lift.score;
      if (best && score >= best.score) continue;
      for (const key of keys) scratch[key].set(base[key]);
      run.order.forEach((each, at) => add(scratch, run.days[at], each.run));
      lift.lifts.forEach((each, at) => add(scratch, lift.days[at], undefined, each.legs));
      score += cost(scratch, days, input.workDays);
      if (!best || score < best.score) best = { score, run, lift };
    }
  }
  if (!best) return empty;
  const { run, lift } = best;
  return {
    runs: Object.fromEntries(run.order.map((each, at) => [each.id, days[run.days[at]].date])),
    lifts: Object.fromEntries(lift.lifts.map((each, at) => [each.id, days[lift.days[at]].date])),
  };
}

/** The week's days from work dates and the mornings after a night, Monday first. */
export function fitDays(monday: string, work: ReadonlySet<string>, afterNight: ReadonlySet<string>): FitDay[] {
  return Array.from({ length: 7 }, (_, at) => {
    const date = addDays(monday, at);
    return { date, work: work.has(date), afterNight: afterNight.has(date) };
  });
}
