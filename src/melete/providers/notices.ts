import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { studyNotices } from '../core/notices';
import { sessions, subjects } from '../app/state';

/** Study sessions the person set, and the morning before a subject's exam or due date, as Meletē's own function works them out. */
export const meleteNotices: Provider<'notices'> = {
  app: 'melete',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:melete:subject:', 'local:melete:session:'],
  read: (ctx) => studyNotices(subjects.list(), sessions.list(), ctx.today, daysAhead(ctx), ctx.now).map((notice) => noticeLine('melete', notice)),
};
