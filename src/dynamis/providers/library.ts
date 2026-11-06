import { watchLocal } from '../../app/family/localChanges';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import { plan, workouts } from '../app/state';

/**
 * The strength sessions in the Library, as the existing adapter projects them (exercises, sets, reps, weights, minutes, how it felt, the
 * note), in the person's unit. Read from Dynamis's own records; never health data brought in or mobility records.
 */
export const dynamisLibrary: Provider<'library'> = {
  app: 'dynamis',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['local:dynamis:workout:', 'setting:dynamis:setup'],
  read: () => lifeRecordAdapters.dynamis.toRecords({ workouts: workouts.list(), unit: plan.load().unit ?? 'kg' }),
  subscribe: (listener) => watchLocal('dynamis:', listener),
};
