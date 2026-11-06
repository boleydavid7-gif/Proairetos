import { mainSleeps } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { addDays } from '../../core/scheduling/dates';
import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { anchorsFrom } from '../core/medicines';
import { careNotices } from '../core/notices';
import { allMedicines, appointments, settings } from '../app/state';

/**
 * Doses, refills and visits, as Therapeia's own notice function works them out. Doses after waking and before sleep follow the
 * person's schedule, as Diaita plans their sleep; the schedule comes as start, end, kind and an own shift's name only.
 */
export const therapeiaNotices: Provider<'notices'> = {
  app: 'therapeia',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:therapeia:medicine:', 'local:therapeia:visit:', 'shared:therapeia', 'setting:therapeia:settings', 'setting:diaita:settings', 'schedulePatterns', 'scheduleExceptions'],
  read: async (ctx) => {
    const medicines = allMedicines();
    const visits = appointments.list();
    if (!medicines.length && !visits.length) return [];
    const horizon = daysAhead(ctx);
    const blocksFrom = new Date(ctx.now.getTime() - 2 * 86_400_000);
    const blocks = ctx.blocks ? await ctx.blocks(blocksFrom, ctx.range?.until ?? ctx.now) : [];
    const anchors = anchorsFrom(mainSleeps(addDays(ctx.today, -2), addDays(ctx.today, horizon + 1), blocks, diaitaSettings.load()));
    const until = ctx.range?.until ?? ctx.now;
    return careNotices(medicines, visits, settings.load().notices, ctx.now, until, anchors).map((notice) => noticeLine('therapeia', notice));
  },
};
