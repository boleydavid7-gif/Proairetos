import { countText, durationText, facts, inYear, type Year } from '../../core/year/year';
import type { MobilityLog } from './mobility';
import type { Workout } from './plan';

/** Strength sessions and mobility in a year: sessions, days, sets, time, and each exercise with its sets. */
export function dynamisYear(workouts: readonly Workout[], mobility: readonly MobilityLog[], year: number): Year {
  const sessions = workouts.filter((workout) => inYear(workout.date, year));
  const routines = mobility.filter((log) => inYear(log.date, year));
  const sets = sessions.reduce((sum, workout) => sum + workout.exercises.reduce((n, exercise) => n + exercise.sets.length, 0), 0);
  const minutes = sessions.reduce((sum, workout) => sum + (workout.minutes ?? 0), 0);
  const mobilityMinutes = routines.reduce((sum, log) => sum + log.minutes, 0);
  const byExercise = new Map<string, number>();
  for (const workout of sessions) for (const exercise of workout.exercises) byExercise.set(exercise.name, (byExercise.get(exercise.name) ?? 0) + exercise.sets.length);
  return {
    facts: facts(
      ['Sessions', sessions.length > 0 && countText(sessions.length)],
      ['Days', sessions.length > 0 && countText(new Set(sessions.map((workout) => workout.date)).size)],
      ['Sets', sets > 0 && countText(sets)],
      ['Time training', minutes > 0 && durationText(minutes)],
      ['Mobility routines', routines.length > 0 && countText(routines.length)],
      ['Time on mobility', mobilityMinutes > 0 && durationText(mobilityMinutes)],
    ),
    lists: [
      { title: 'Sets by exercise', lines: [...byExercise].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => `${name}: ${countText(n)}`) },
    ].filter((list) => list.lines.length),
  };
}
