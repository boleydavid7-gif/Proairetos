import { watchLocal } from '../../app/family/localChanges';
import { liftDays, refreshTrainingWeek, watchTrainingWeek } from '../../app/family/trainingWeek';
import type { Provider } from '../../core/providers';
import { isSetup, plan } from '../app/state';
import { isTrainingDay, nextSession, sessionsFor, type Workout } from '../core/plan';

/*
 * One line on strength: today's session, the one done today, or a rest day. Names only; never weights, reps, notes
 * or heart rate (manifest, dynamis.home). The week is placed around work and Askesis, which this asks to be current.
 */
export const dynamisHome: Provider<'home'> = {
  app: 'dynamis',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:dynamis:workout:', 'setting:dynamis:setup', 'device:trainingWeekFit', 'schedulePatterns', 'scheduleExceptions'],
  async read(ctx) {
    const setup = plan.load();
    const workouts = (await ctx.records<Workout>('local:dynamis:workout:')).filter((workout) => typeof workout.id === 'string');
    let detail: string;
    if (!isSetup(setup)) detail = 'Set up strength training';
    else {
      const done = workouts.filter((workout) => workout.date === ctx.today).slice(-1)[0];
      if (done) detail = `${sessionsFor(setup).find((session) => session.key === done.session)?.name ?? 'Strength session'} · Done today`;
      else if (isTrainingDay(setup, ctx.today, liftDays(ctx.today))) detail = `Strength session · ${nextSession(setup, workouts)?.name ?? 'Next session'}`;
      else detail = 'Rest day';
    }
    return [{ ref: { app: 'dynamis', kind: 'practice', id: 'today' }, group: 'practice', detail, open: '/dynamis/' }];
  },
  warm: (ctx) => refreshTrainingWeek(ctx.now),
  subscribe(listener) {
    const offs = [watchTrainingWeek(listener), watchLocal('dynamis:workout:', listener), watchLocal('dynamis:setup', listener)];
    return () => offs.forEach((off) => off());
  },
};
