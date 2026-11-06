import { liftDays, trainingTimeOn } from '../../app/family/trainingWeek';
import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { trainingNotices } from '../core/notices';
import { nextSession } from '../core/plan';
import { isSetup, plan, settings, workouts } from '../app/state';

/**
 * One reminder on each training day, at the person's time, naming the session ("Session B", "A training day."). Never a lift,
 * a weight, a rep, a set, a note or how it felt. The days and times are the shared training week's, as before.
 */
export const dynamisNotices: Provider<'notices'> = {
  app: 'dynamis',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['setting:dynamis:setup', 'setting:dynamis:settings', 'local:dynamis:workout:', 'schedulePatterns', 'scheduleExceptions'],
  read: (ctx) => {
    const training = plan.load();
    if (!isSetup(training) || !settings.load().reminders) return [];
    const notices = trainingNotices(training, true, nextSession(training, workouts.list()).name, ctx.today, daysAhead(ctx), ctx.now, liftDays, (date) => trainingTimeOn('dynamis', date));
    return notices.map((notice) => noticeLine('dynamis', notice));
  },
};
