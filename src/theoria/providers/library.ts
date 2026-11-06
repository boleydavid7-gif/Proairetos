import { lifeService } from '../../app/services';
import { combineReadingSessions, studySessions } from '../../app/praxis/study';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';

/**
 * Study and reading sessions in the Library, as the existing adapter projects them: the block's title (or "Read: book"), the day, and the
 * minutes, as reading or study. Reading stretches of one book on one day are combined into one entry, as the Library has always shown them.
 * Read from the timer's blocks and focus events on this device. Never book files, highlights, notes in books, bookmarks or the reading position.
 */
export const theoriaLibrary: Provider<'library'> = {
  app: 'theoria',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['lifeItems', 'itemEvents'],
  async read() {
    const [blocks, events] = await Promise.all([lifeService.listForApp('praxis'), lifeService.historyForAll(true)]);
    return lifeRecordAdapters.theoria.toRecords(combineReadingSessions(studySessions(blocks, events)));
  },
  subscribe: (listener) => lifeService.subscribe(listener),
};
