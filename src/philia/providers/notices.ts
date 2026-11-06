import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { peopleNotices } from '../core/notices';
import { people, settings } from '../app/state';

/** Birthdays, other dates and keep-in-touch days, as Philia's own notice function works them out. */
export const philiaNotices: Provider<'notices'> = {
  app: 'philia',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:philia:person:'],
  read: (ctx) => peopleNotices(people.list(), settings.load().notices, ctx.today, daysAhead(ctx)).map((notice) => noticeLine('philia', notice)),
};
