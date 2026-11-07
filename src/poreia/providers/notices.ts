import { noticeLine, type Provider } from '../../core/providers';
import { tripNotices } from '../core/notices';
import { bookings, packing, plans, settings, trips } from '../app/state';

/** Travel, check-in, stays, tickets, plans and the evening before a trip, as Poreia's own notice function works them out. */
export const poreiaNotices: Provider<'notices'> = {
  app: 'poreia',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:poreia:trip:', 'local:poreia:booking:', 'local:poreia:plan:', 'local:poreia:pack:', 'setting:poreia:settings'],
  read: (ctx) => {
    const until = ctx.range?.until ?? ctx.now;
    return tripNotices(trips.list(), bookings.list(), plans.list(), packing.list(), settings.load().notices, ctx.now, until).map((notice) => noticeLine('poreia', notice));
  },
};
