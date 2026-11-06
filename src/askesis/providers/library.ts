import { watchLocal } from '../../app/family/localChanges';
import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import type { LogEntry } from '../core/log';

/**
 * The runs and walks in the Library, as the existing adapter projects them (title, distance and time in the person's unit, how it felt,
 * notes). Read from Askesis's own log; never heart rate, GPS points, shoes or health data brought in. Nothing is written or kept.
 */
export const askesisLibrary: Provider<'library'> = {
  app: 'askesis',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['askesisWorkouts', 'setting:askesis:settings'],
  async read(ctx) {
    const workouts = await ctx.records<LogEntry>('askesisWorkouts');
    let unit: 'km' | 'mi' = 'km';
    try {
      unit = (JSON.parse(ctx.setting('askesis:settings') ?? '{}') as { unit?: 'km' | 'mi' }).unit ?? 'km';
    } catch {
      unit = 'km';
    }
    return lifeRecordAdapters.askesis.toRecords({ workouts, unit });
  },
  subscribe: (listener) => watchLocal('askesis:settings', listener),
};
