import { addDays, mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import { isAdded } from './added';

export type TrainingDay = { run: boolean; lift: boolean };

/**
 * Which of `days` hold a run or a strength session still to do, read from Askesis's plan and Dynamis's setup the same
 * way their own pages place them (`fitWeekOf`, `todaysRun`, `isTrainingDay`). Read only; loaded only when asked, and
 * only for an app that is added.
 */
export async function trainingOnDays(days: readonly string[], now = new Date()): Promise<Map<string, TrainingDay>> {
  const out = new Map<string, TrainingDay>(days.map((day) => [day, { run: false, lift: false }]));
  const today = toLocalDate(now);
  const askesis = isAdded('askesis');
  const dynamis = isAdded('dynamis');
  if (!askesis && !dynamis) return out;
  const { fitWeekOf, liftDays } = await import('./trainingWeek');
  for (const monday of new Set(days.map((day) => mondayOnOrBefore(day)))) {
    const from = monday > today ? monday : today > addDays(monday, 6) ? monday : today;
    await fitWeekOf(monday, from, today).catch(() => undefined);
  }
  if (askesis) {
    const { readRuns, todaysRun } = await import('../askesis/runs');
    const runs = await readRuns();
    for (const day of days) if (todaysRun(runs, day)) out.get(day)!.run = true;
  }
  if (dynamis) {
    const [{ plan, workouts, isSetup }, { isTrainingDay }] = await Promise.all([import('../../dynamis/app/state'), import('../../dynamis/core/plan')]);
    const setup = plan.load();
    if (isSetup(setup)) {
      const done = workouts.list();
      for (const day of days) if (isTrainingDay(setup, day, liftDays(day)) && !done.some((workout) => workout.date === day)) out.get(day)!.lift = true;
    }
  }
  return out;
}
