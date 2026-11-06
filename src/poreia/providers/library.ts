import { watchLocal } from '../../app/family/localChanges';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import { journal, trips } from '../app/state';

/**
 * Completed trips and their journal entries, as the existing adapter projects them: a trip is listed once its end has passed (the person's
 * day), and a journal entry only with a completed trip. A trip's name, places and dates; a journal entry's title, text, kind and place.
 * Never an upcoming trip, a booking, a confirmation code, an address, a document, spending, time off, a plan or the packing list.
 */
export const poreiaLibrary: Provider<'library'> = {
  app: 'poreia',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['local:poreia:trip:', 'local:poreia:journal:'],
  read: (ctx) => lifeRecordAdapters.poreia.toRecords({ trips: trips.list(), journal: journal.list(), today: ctx.today }),
  subscribe: (listener) => watchLocal('poreia:', listener),
};
