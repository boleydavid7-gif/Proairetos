import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { upkeepNotices } from '../core/notices';
import { settings, things, upkeeps } from '../app/state';

/** Upkeep that comes round and warranties that end, as Ktema's own notice function works them out. */
export const ktemaNotices: Provider<'notices'> = {
  app: 'ktema',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ktema:thing:', 'local:ktema:upkeep:'],
  read: (ctx) => upkeepNotices(upkeeps.list(), things.list(), settings.load().notices, ctx.today, daysAhead(ctx), ctx.now).map((notice) => noticeLine('ktema', notice)),
};
