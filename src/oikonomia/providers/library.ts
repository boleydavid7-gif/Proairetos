import { watchLocal } from '../../app/family/localChanges';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import { reflectMilestones } from '../data/reflect';

/**
 * The financial milestones the person wrote and chose for Reflect (`inReflect`), as the existing adapter projects them: a title, a day and
 * the words they wrote. Never a bill, an amount, an account or card number, a balance, an envelope, a statement or a transaction, and never
 * a milestone that was not chosen. Oikonomia's financial records are not read.
 */
export const oikonomiaLibrary: Provider<'library'> = {
  app: 'oikonomia',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['local:oikonomia:reflect-milestone:'],
  read: () => lifeRecordAdapters.oikonomia.toRecords(reflectMilestones.list()),
  subscribe: (listener) => watchLocal('oikonomia:reflect-milestone:', listener),
};
