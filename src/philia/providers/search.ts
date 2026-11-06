import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import type { Person } from '../core/people';

/* People: name, who they are, the person's own remember lines, gift ideas and times together. Not phone, email or dates (manifest, philia.search). */
export const philiaSearch: Provider<'search'> = {
  app: 'philia',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:philia:person:'],
  async read(ctx) {
    return (await ctx.records<Person>('local:philia:person:'))
      .filter((person) => typeof person.id === 'string')
      .map((person) => ({
        ref: { app: 'philia' as const, kind: 'person', id: person.id },
        title: person.name,
        titleField: 'person name',
        fields: present(
          { name: 'relation', text: person.relation },
          { name: 'remember lines', text: person.notes.map((note) => note.text).join('\n') },
          { name: 'gift ideas', text: person.gifts.map((gift) => gift.text).join('\n') },
          { name: 'times together', text: person.times.map((time) => time.text).join('\n') },
        ),
        at: person.createdAt,
        label: 'Person in Philia',
        open: `/philia/?open=${encodeURIComponent(`person:${person.id}`)}`,
      }));
  },
  subscribe: (listener) => watchLocal('philia:person:', listener),
};
