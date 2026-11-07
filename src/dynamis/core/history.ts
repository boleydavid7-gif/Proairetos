import type { ExerciseLog, Unit, Workout } from './plan';

export type ExerciseSession = { date: string; workoutId: string; log: ExerciseLog };

/** Every session an exercise was done in, newest first. */
export function exerciseHistory(workouts: readonly Workout[], exercise: string): ExerciseSession[] {
  return workouts
    .flatMap((workout) => workout.exercises.filter((each) => each.exercise === exercise && each.sets.length).map((log) => ({ date: workout.date, workoutId: workout.id, log, createdAt: workout.createdAt })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map(({ date, workoutId, log }) => ({ date, workoutId, log }));
}

/** Plain records from the log: the heaviest set (most reps at that weight) and the most reps in one set. */
export function exerciseRecords(history: readonly ExerciseSession[]): { heaviest?: { weight: number; reps: number; date: string }; mostReps?: { reps: number; weight?: number; date: string } } {
  let heaviest: { weight: number; reps: number; date: string } | undefined;
  let mostReps: { reps: number; weight?: number; date: string } | undefined;
  for (const { date, log } of [...history].reverse()) {
    for (const set of log.sets) {
      if (set.weight !== undefined && (!heaviest || set.weight > heaviest.weight || (set.weight === heaviest.weight && set.reps > heaviest.reps))) heaviest = { weight: set.weight, reps: set.reps, date };
      if (!mostReps || set.reps > mostReps.reps) mostReps = { reps: set.reps, weight: set.weight, date };
    }
  }
  return { heaviest, mostReps };
}

/** Lifts done with a barbell, so the plate calculator is offered. */
export const BARBELL = new Set(['back-squat', 'romanian-deadlift']);

export const PLATES: Record<Unit, number[]> = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] };
export const BARS: Record<Unit, number[]> = { kg: [20, 15, 10], lb: [45, 35, 15] };

/**
 * Plates for each side of the bar to make a total, largest first, from the usual plates. When the total cannot be
 * made exactly, `left` says how much short each side is.
 */
export function platesFor(total: number, bar: number, unit: Unit, plates: readonly number[] = PLATES[unit]): { side: number[]; left: number } {
  let rest = Math.round(((total - bar) / 2) * 100) / 100;
  if (!(rest > 0)) return { side: [], left: 0 };
  const side: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (rest + 1e-9 >= plate) {
      side.push(plate);
      rest = Math.round((rest - plate) * 100) / 100;
    }
  }
  return { side, left: rest };
}

/** "20 + 5 + 2.5 each side". */
export function platesText(side: readonly number[]): string {
  return side.length ? `${side.join(' + ')} each side` : 'The bar alone';
}
