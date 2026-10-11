import { addDays, daysBetween, parseLocalDate } from '../../core/scheduling/dates';
import { describe, exerciseFor, isLadder, LADDERS, EXERCISES, type Pattern, type Place } from './library';

/*
 * Dynamis's plan, from the research (sources below, shown in the app):
 *  - every major muscle group at least twice a week: two or three full-body sessions, or four that alternate upper
 *    and lower body (ACSM 2026; Schoenfeld 2016);
 *  - begin with two sets of each exercise and build gradually; an extra set is offered, never added by itself
 *    (ACSM 2026); about ten weekly sets per muscle suits growing muscle (Schoenfeld 2017);
 *  - repetitions by aim: heavier and fewer for strength, a middle range otherwise; muscle grows across a wide range
 *    of loads, while heavier loads build more strength (Lopez 2021);
 *  - each set stops with one to three repetitions left in reserve; going to failure is not needed (Robinson 2024;
 *    Helms 2016; ACSM 2026);
 *  - when every set reaches the top of the range, about 2 to 10 percent more weight, or the next step of a
 *    bodyweight ladder, is offered (ACSM 2009);
 *  - longer rests for the big lifts (Schoenfeld 2016, rest intervals).
 * The sessions come in order whatever day they are done; one not done waits, nothing piles up.
 */

export type Aim = 'health' | 'strength' | 'muscle';
export type Unit = 'kg' | 'lb';

export type Setup = {
  aim: Aim;
  place: Place;
  isNew: boolean;
  /** Weekdays planned for training, 0 = Sunday. */
  days: number[];
  /** Sets of each exercise. */
  sets: number;
  /** The day the present number of sets began, for offering one more. */
  setsSince: string;
  unit: Unit;
  startedOn: string;
  /** For bodyweight ladders: the step each is on. */
  steps: Record<string, number>;
  /** The person's own choice of exercise for a pattern, in place of the usual one. */
  swaps?: Partial<Record<Pattern, string>>;
  /** Usual time on training days, for a reminder (optional). */
  at?: string;
};

export type SetLog = { weight?: number; reps: number };
export type ExerciseLog = { exercise: string; step?: number; name: string; sets: SetLog[] };
export type Felt = 'easy' | 'good' | 'hard';
export type Workout = { id: string; date: string; session: string; exercises: ExerciseLog[]; felt?: Felt; minutes?: number; note?: string; createdAt: string };

export const SOURCES = {
  frequency:
    'American College of Sports Medicine, Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults (Med Sci Sports Exerc, 2026); Schoenfeld, Ogborn & Krieger, Effects of resistance training frequency on measures of muscle hypertrophy (Sports Med, 2016)',
  volume: 'Schoenfeld, Ogborn & Krieger, Dose-response relationship between weekly resistance training volume and increases in muscle mass (J Sports Sci, 2017)',
  load: 'Lopez et al., Resistance training load effects on muscle hypertrophy and strength gain (Med Sci Sports Exerc, 2021)',
  effort:
    'Robinson et al., Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy (Sports Med, 2024); Helms et al., Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training (Strength Cond J, 2016)',
  progression: 'American College of Sports Medicine, Progression models in resistance training for healthy adults (Med Sci Sports Exerc, 2009)',
  rest: 'Schoenfeld et al., Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men (J Strength Cond Res, 2016)',
  mobility:
    'Thomas et al., The relation between stretching typology and stretching duration: the effects on range of motion (Int J Sports Med, 2018); Afonso et al., Strength training versus stretching for improving range of motion (Healthcare, 2021)',
  guidelines: 'Bull et al., World Health Organization 2020 guidelines on physical activity and sedentary behaviour (Br J Sports Med, 2020)',
} as const;

/** How the plan is built, line by line, each with where it comes from. */
export const WHY: { line: string; source: keyof typeof SOURCES }[] = [
  { line: 'Muscle-strengthening on two or more days a week.', source: 'guidelines' },
  { line: 'Each major muscle group twice a week: full-body sessions, or upper and lower body on four days.', source: 'frequency' },
  { line: 'Two sets of each exercise to begin; another is offered after a few weeks.', source: 'frequency' },
  { line: 'About ten sets a week for each muscle when growing muscle is the aim.', source: 'volume' },
  { line: 'Fewer, heavier repetitions for strength; muscle grows across a wide range of weights.', source: 'load' },
  { line: 'Stop each set with one to three repetitions left in you. Going to failure is not needed.', source: 'effort' },
  { line: 'When every set reaches the top of the range, a little more weight (about 2 to 10 percent) is offered.', source: 'progression' },
  { line: 'Longer rests between sets of the big lifts.', source: 'rest' },
  { line: 'A few minutes of mobility on most days; training through a full range helps as much as stretching.', source: 'mobility' },
];

export const AIM_NAMES: Record<Aim, string> = { health: 'Stay strong', strength: 'Get stronger', muscle: 'Build muscle' };

export type Session = { key: string; name: string; patterns: Pattern[] };

/** The sessions the plan takes in turn. */
export function sessionsFor(setup: Pick<Setup, 'days'>): Session[] {
  if (setup.days.length >= 4) {
    return [
      { key: 'U', name: 'Upper body', patterns: ['push', 'pull', 'press', 'pulldown'] },
      { key: 'L', name: 'Lower body', patterns: ['squat', 'hinge', 'single', 'core'] },
    ];
  }
  return [
    { key: 'A', name: 'Session A', patterns: ['squat', 'push', 'pull', 'single'] },
    { key: 'B', name: 'Session B', patterns: ['hinge', 'press', 'pulldown', 'core'] },
  ];
}

/** The session to do next: the one after the last done, whatever day it is. */
export function nextSession(setup: Setup, workouts: readonly Workout[]): Session {
  const sessions = sessionsFor(setup);
  const last = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)).pop();
  const at = last ? sessions.findIndex((session) => session.key === last.session) : -1;
  return sessions[(at + 1) % sessions.length];
}

export function exerciseId(setup: Setup, pattern: Pattern): string {
  return setup.swaps?.[pattern] ?? exerciseFor(pattern, setup.place, setup.isNew);
}

/** Repetitions (or seconds) to aim for in each set. */
export function range(setup: Pick<Setup, 'aim' | 'isNew'>, measure: 'reps' | 'seconds'): [number, number] {
  if (measure === 'seconds') return [20, 45];
  if (setup.aim === 'strength') return setup.isNew ? [6, 10] : [4, 6];
  if (setup.aim === 'muscle') return [8, 12];
  return setup.isNew ? [10, 15] : [8, 12];
}

/** Seconds of rest between sets. */
export function restFor(aim: Aim, big: boolean): number {
  if (aim === 'strength') return big ? 180 : 120;
  if (aim === 'muscle') return big ? 120 : 90;
  return big ? 90 : 60;
}

/** The smallest jump for a weight: plates on a bar or machine, or the next pair of dumbbells. */
export function weightStep(exercise: string, unit: Unit): number {
  const dumbbell = ['goblet-squat', 'bench-press', 'floor-press', 'dumbbell-row', 'shoulder-press', 'split-squat', 'step-up', 'farmer-carry'].includes(exercise) || exercise === 'romanian-deadlift';
  if (unit === 'lb') return 5;
  return dumbbell ? 2 : 2.5;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** About 5 percent more, never less than one step, within the 2 to 10 percent ACSM gives. */
export function nextWeight(weight: number, exercise: string, unit: Unit): number {
  const step = weightStep(exercise, unit);
  return Math.max(weight + step, roundTo(weight * 1.05, step));
}

/** A little lighter (about 10 percent) to come back on after time away, on a step. */
export function lighterWeight(weight: number, exercise: string, unit: Unit): number {
  const step = weightStep(exercise, unit);
  return Math.max(step, Math.floor((weight * 0.9) / step) * step);
}

export function lastLog(workouts: readonly Workout[], exercise: string): { log: ExerciseLog; date: string } | undefined {
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const workout of sorted) {
    const log = workout.exercises.find((each) => each.exercise === exercise && each.sets.length > 0);
    if (log) return { log, date: workout.date };
  }
  return undefined;
}

export type Target = {
  exercise: string;
  pattern: Pattern;
  name: string;
  how: string[];
  measure: 'reps' | 'seconds';
  loaded: boolean;
  step?: number;
  sets: number;
  range: [number, number];
  rest: number;
  /** A big lift, for warm-ups and longer rests. */
  big: boolean;
  /** What was done last time. */
  last?: ExerciseLog;
  /** The weight to start from: last time's. */
  weight?: number;
  /** Offered, never applied by itself. */
  ready?: { weight: number } | { step: number; name: string } | { seconds: number };
};

/** What each exercise of a session asks for today, from the last time it was done. */
export function targetsFor(setup: Setup, session: Session, workouts: readonly Workout[]): Target[] {
  return session.patterns.map((pattern) => {
    const id = exerciseId(setup, pattern);
    const step = isLadder(id) ? setup.steps[id] ?? (setup.isNew ? 0 : Math.min(1, LADDERS[id].length - 1)) : undefined;
    const about = describe(id, step);
    const span = range(setup, about.measure);
    const found = lastLog(workouts, id);
    const last = found && (step === undefined || found.log.step === step) ? found.log : undefined;
    const weight = last?.sets.map((set) => set.weight).filter((value): value is number => typeof value === 'number').pop();
    const reachedTop = Boolean(last && last.sets.length >= setup.sets && last.sets.every((set) => set.reps >= span[1]));
    let ready: Target['ready'];
    if (reachedTop) {
      if (about.loaded && weight !== undefined) ready = { weight: nextWeight(weight, id, setup.unit) };
      else if (step !== undefined && step + 1 < LADDERS[id].length) ready = { step: step + 1, name: LADDERS[id][step + 1].name };
      else if (about.measure === 'seconds') ready = { seconds: span[1] + 5 };
    }
    return {
      exercise: id,
      pattern,
      name: about.name,
      how: about.how,
      measure: about.measure,
      loaded: about.loaded,
      step,
      sets: setup.sets,
      range: span,
      rest: restFor(setup.aim, about.big),
      big: about.big,
      last,
      weight,
      ready,
    };
  });
}

/** Minutes a session takes, about: each set about 45 seconds, plus rests, plus a few minutes to warm up. */
export function sessionMinutes(targets: readonly Target[]): number {
  const seconds = targets.reduce((sum, target) => sum + target.sets * 45 + (target.sets - 1) * target.rest + 60, 0);
  return Math.round((seconds + 300) / 300) * 5;
}

/** The target number of sets for the aim: three, or four for muscle on two days a week (about ten sets a muscle). */
export function fullSets(setup: Pick<Setup, 'aim' | 'days'>): number {
  return setup.aim === 'muscle' && setup.days.length <= 2 ? 4 : 3;
}

/** One more set is offered after six sessions at the present number, up to the aim's full number. */
export function setsOffer(setup: Setup, workouts: readonly Workout[]): number | undefined {
  if (setup.sets >= fullSets(setup)) return undefined;
  const since = workouts.filter((workout) => workout.date >= setup.setsSince).length;
  return since >= 6 ? setup.sets + 1 : undefined;
}

/** After two weeks or more with no session, coming back a little lighter is offered once. */
export function awayDays(workouts: readonly Workout[], today: string): number | undefined {
  const last = workouts.map((workout) => workout.date).sort().pop();
  if (!last) return undefined;
  const days = daysBetween(last, today);
  return days >= 14 ? days : undefined;
}

/** The planned training days of the week that holds `date` (Monday first). */
export function weekDays(setup: Pick<Setup, 'days'>, date: string): string[] {
  const day = parseLocalDate(date).getDay();
  const monday = addDays(date, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index)).filter((each) => setup.days.includes(parseLocalDate(each).getDay()));
}

export function isTrainingDay(setup: Pick<Setup, 'days'>, date: string): boolean {
  return setup.days.includes(parseLocalDate(date).getDay());
}

/** A new plan from the person's answers. */
export function newSetup(answers: Pick<Setup, 'aim' | 'place' | 'isNew' | 'days' | 'unit'>, today: string): Setup {
  return { ...answers, sets: answers.isNew ? 2 : 3, setsSince: today, startedOn: today, steps: {} };
}

/** Facts for an exercise's page: its first and latest sessions and how many times it was done. */
export function exerciseFacts(workouts: readonly Workout[], exercise: string): { times: number; first?: { date: string; log: ExerciseLog }; latest?: { date: string; log: ExerciseLog } } {
  const done = [...workouts].sort((a, b) => a.date.localeCompare(b.date)).flatMap((workout) => workout.exercises.filter((each) => each.exercise === exercise && each.sets.length).map((log) => ({ date: workout.date, log })));
  return { times: done.length, first: done[0], latest: done[done.length - 1] };
}

export function setsText(log: ExerciseLog, unit: Unit, measure: 'reps' | 'seconds' = 'reps'): string {
  return log.sets.map((set) => (set.weight !== undefined ? `${set.weight} ${unit} × ${set.reps}` : measure === 'seconds' ? `${set.reps} s` : `${set.reps}`)).join(', ');
}

export const exerciseName = (id: string) => EXERCISES[id]?.name ?? LADDERS[id]?.[0]?.name ?? id;

/** Optional warm-up sets before a big lift with weight: about half for 8, then about three-quarters for 4. */
export function warmUp(target: Pick<Target, 'exercise' | 'loaded' | 'weight'> & { big?: boolean }, unit: Unit): { weight: number; reps: number }[] {
  if (!target.loaded || target.weight === undefined || !target.big) return [];
  const step = weightStep(target.exercise, unit);
  const at = (share: number) => Math.max(step, Math.round((target.weight! * share) / step) * step);
  const sets = [{ weight: at(0.5), reps: 8 }, { weight: at(0.75), reps: 4 }];
  return sets.filter((set, index) => set.weight < target.weight! && (index === 0 || set.weight > sets[0].weight));
}

/** Askesis's run days (Monday = 0 there) as JavaScript weekdays (Sunday = 0). */
export const fromRunDays = (weekdays: readonly number[]) => weekdays.map((day) => (day + 1) % 7);
