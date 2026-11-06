import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import { dayWords } from '../../core/search/dayWords';
import type { Workout } from '../core/plan';

/*
 * Strength sessions that have a note: a title and the person's note. Not weights, reps or heart rate (manifest,
 * dynamis.search). The day in a title is the session's own calendar day, the same in every time zone.
 */
export const dynamisSearch: Provider<'search'> = {
  app: 'dynamis',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:dynamis:workout:'],
  async read(ctx) {
    return (await ctx.records<Workout>('local:dynamis:workout:'))
      .filter((workout) => typeof workout.id === 'string' && workout.note)
      .map((workout) => ({
        ref: { app: 'dynamis' as const, kind: 'session', id: workout.id },
        title: `Strength, ${dayWords(workout.date, ctx.today)}`,
        titleField: 'session title',
        fields: present({ name: 'session note', text: workout.note }),
        at: workout.createdAt,
        label: 'Session in Dynamis',
        open: '/dynamis/',
      }));
  },
  subscribe: (listener) => watchLocal('dynamis:workout:', listener),
};
