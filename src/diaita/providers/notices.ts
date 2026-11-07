import { addDays } from '../../core/scheduling/dates';
import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { rhythmNotices } from '../core/notices';
import { planBetween } from '../core/rhythm';
import { settings, sunPlace } from '../app/state';

/**
 * The five reminders of the sleep plan: wind down, worry time, a nap, morning daylight and last caffeine, at the time itself, as
 * Diaita's own notice function works them out. The plan is made from the person's schedule, which arrives as start, end, kind and
 * the name of a shift in their own schedule; a name from another calendar's event never reaches it.
 */
export const diaitaNotices: Provider<'notices'> = {
  app: 'diaita',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['setting:diaita:settings', 'schedulePatterns', 'scheduleExceptions'],
  read: async (ctx) => {
    const diaita = settings.load();
    if (!diaita.started) return [];
    const until = ctx.range?.until ?? ctx.now;
    const blocks = ctx.blocks ? await ctx.blocks(new Date(ctx.now.getTime() - 2 * 86_400_000), until) : [];
    const entries = planBetween(addDays(ctx.today, -1), addDays(ctx.today, daysAhead(ctx)), blocks, { ...diaita, place: sunPlace() });
    return rhythmNotices(entries, diaita.notices, ctx.now, until).map((notice) => noticeLine('diaita', notice));
  },
};
