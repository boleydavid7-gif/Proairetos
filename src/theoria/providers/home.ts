import { lifeService } from '../../app/services';
import { studyBetween, studySessions } from '../../app/praxis/study';
import type { Provider } from '../../core/providers';

/*
 * One line on reading: the minutes read in the person's day from reading blocks. Minutes only; never book titles,
 * highlights or notes (manifest, theoria.home). The timer's blocks are read from the life records on this device.
 */
export const theoriaHome: Provider<'home'> = {
  app: 'theoria',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['lifeItems', 'itemEvents'],
  async read(ctx) {
    const [blocks, events] = await Promise.all([lifeService.listForApp('praxis'), lifeService.historyForAll(true)]);
    const range = ctx.day ?? { start: new Date(`${ctx.today}T00:00:00`), end: new Date(`${ctx.today}T23:59:59`) };
    const minutes = studyBetween(studySessions(blocks, events), range.start, range.end)
      .filter((session) => session.kind === 'reading')
      .reduce((total, session) => total + session.minutes, 0);
    return [{ ref: { app: 'theoria', kind: 'practice', id: 'today' }, group: 'practice', detail: minutes ? `${minutes} min reading today` : 'No reading logged today', open: '/theoria/' }];
  },
  subscribe: (listener) => lifeService.subscribe(listener),
};
