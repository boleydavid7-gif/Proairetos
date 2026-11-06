import { householdActor } from '../../app/household/household';
import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { choreNotices } from '../core/notices';
import { daysOffNow } from '../app/daysOff';
import { allChores, myName, settings } from '../app/state';

/** The chores that come round, one notice a day naming them (or at a chore's own time), as Ergon's own function works them out. */
export const ergonNotices: Provider<'notices'> = {
  app: 'ergon',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ergon:chore:', 'shared:ergon', 'setting:ergon:settings', 'schedulePatterns', 'scheduleExceptions'],
  read: async (ctx) => {
    const chores = allChores();
    const current = settings.load();
    const notices = choreNotices(chores, current.notices, myName(current) || undefined, ctx.today, daysAhead(ctx), await daysOffNow().catch(() => undefined), householdActor('ergon')?.id);
    return notices.map((notice) => noticeLine('ergon', notice));
  },
};
