import { daysBetween } from '../../core/scheduling/dates';
import type { LogEntry } from './log';
import { set, step, totalMinutes, type Part, type Workout } from './workouts';

/**
 * Two ways the plan bends to a life, both offered, never decided for anyone.
 *
 * A lighter day: today's session swapped for an easier version, for today
 * only; tomorrow the plan is as it was. Nothing is owed for it.
 *
 * Coming back: after two weeks or more with nothing logged, fitness fades a
 * little (Mujika and Padilla, 2000), so starting a few weeks earlier in the
 * plan is offered once. Carrying on is just as fine.
 */
export type Lighter = { date: string; workoutId: string };

const round5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

export function canLighten(workout: Workout): boolean {
  return workout.kind !== 'race' && workout.kind !== 'walk' && totalMinutes(workout.parts) >= 15;
}

export function lighterVersion(workout: Workout): Workout {
  const why = 'A lighter version of this session, for today only.';
  if (workout.kind === 'walk-run') {
    // Fewer repeats, or half the continuous run, with the same warm-up and cool-down.
    const parts: Part[] = workout.parts.map((part) => {
      if ('repeat' in part) return set(Math.max(2, Math.ceil(part.repeat / 2)), ...part.steps);
      if (part.effort === 'easy') return step('easy', Math.max(5, Math.round(part.minutes / 2)));
      return part;
    });
    return { ...workout, title: `${workout.title}, lighter`, summary: 'Half the running, just for today', parts, why };
  }
  const minutes = Math.min(40, Math.max(15, round5(totalMinutes(workout.parts) * 0.6)));
  return {
    ...workout,
    kind: 'easy',
    title: 'Easy run, lighter',
    summary: 'Shorter and easy, just for today',
    parts: [step('easy', minutes)],
    why,
    tips: ['Easy enough to talk the whole way.', 'Walking some of it is fine.'],
  };
}

/** The session as it stands today: lighter if the person chose that for today. */
export function asToday(workout: Workout, lighter: Lighter | undefined, today: string): Workout {
  return lighter && lighter.date === today && lighter.workoutId === workout.id ? lighterVersion(workout) : workout;
}

export type ComeBack = { gapDays: number; lastDate: string; fromWeek: number; toWeek: number };

/** After two weeks or more since the last workout, an earlier week to start again from. */
export function comeBackOffer(
  entries: readonly LogEntry[],
  week: number,
  today: string,
  alreadyAsked: string | undefined,
  startedOn?: string,
): ComeBack | undefined {
  const last = entries.reduce<string | undefined>((latest, entry) => (!latest || entry.date > latest ? entry.date : latest), undefined);
  if (!last || last === alreadyAsked || week <= 1) return undefined;
  // Time away counts from the later of the last workout and the plan's start: a new plan is not a return.
  const since = startedOn && startedOn > last ? startedOn : last;
  const gapDays = daysBetween(since, today);
  if (gapDays < 14) return undefined;
  const back = gapDays < 21 ? 1 : gapDays < 35 ? 2 : gapDays < 56 ? 3 : week - 1;
  const toWeek = Math.max(1, week - back);
  return toWeek < week ? { gapDays, lastDate: last, fromWeek: week, toWeek } : undefined;
}

/** "2 weeks", "a month" — plain words for a gap. */
export function gapWords(days: number): string {
  if (days < 28) return `${Math.round(days / 7)} weeks`;
  if (days < 60) return 'about a month';
  return `about ${Math.round(days / 30)} months`;
}

