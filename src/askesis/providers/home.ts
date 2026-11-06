import { readRuns, runLength, runTitle, todaysRun } from '../../app/askesis/runs';
import { refreshTrainingWeek, watchTrainingWeek } from '../../app/family/trainingWeek';
import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';

/*
 * One line on running: today's session (its title and length), or the run done today, or that no run is planned.
 * Titles, distance and time of today's run only; never heart rate, notes or the log (manifest, askesis.home).
 * The week is placed around work and Dynamis (a worked-out week kept on this device), which this asks to be current.
 */
export const askesisHome: Provider<'home'> = {
  app: 'askesis',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['askesisWorkouts', 'askesisPlans', 'setting:askesis:settings', 'device:trainingWeekFit', 'schedulePatterns', 'scheduleExceptions'],
  async read(ctx) {
    const runs = await readRuns();
    const run = todaysRun(runs, ctx.today);
    const completed = runs.workouts.filter((entry) => entry.date === ctx.today).slice(-1)[0];
    const detail = run
      ? [run.title, runLength(run)].filter(Boolean).join(' · ')
      : completed
        ? `${runTitle(completed, runs.unit)} · Done today`
        : runs.plan
          ? 'No run scheduled today'
          : 'Start a running plan';
    return [{ ref: { app: 'askesis', kind: 'practice', id: 'today' }, group: 'practice', detail, open: '/askesis/' }];
  },
  warm: (ctx) => refreshTrainingWeek(ctx.now),
  subscribe(listener) {
    const offs = [watchTrainingWeek(listener), watchLocal('askesis:settings', listener)];
    return () => offs.forEach((off) => off());
  },
};
