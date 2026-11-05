import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';
import { comingUp, whenText, type Person } from '../core/people';

/* Birthdays and dates in the next week: the person's name, what it is and when. Not phone, email or notes (manifest, philia.home). */
export const philiaHome: Provider<'home'> = {
  app: 'philia',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:philia:person:'],
  async read(ctx) {
    const everyone = (await ctx.records<Person>('local:philia:person:')).filter((person) => typeof person.id === 'string');
    const soon = comingUp(everyone, ctx.today, 7);
    if (soon.length === 0) return [];
    const first = soon[0];
    const name = (entry: (typeof soon)[number]) => (entry.label === 'Birthday' ? `${entry.person.name}’s birthday` : `${entry.person.name}: ${entry.label}`);
    return [
      {
        ref: { app: 'philia', kind: 'coming-up', id: 'week' },
        group: 'attention',
        title: soon.slice(0, 2).map((entry) => `${name(entry)} ${whenText(entry.date, ctx.today).toLowerCase()}`).join(' · '),
        detail: soon.length > 2 ? `And ${soon.length - 2} more` : 'Coming up',
        open: soon.length === 1 ? `/philia/?open=${encodeURIComponent(`person:${first.person.id}`)}` : '/philia/',
        icon: 'person',
        swipe: { id: `birthdays:${soon.map((entry) => `${entry.person.id}@${entry.date}`).join(',')}` },
        notForMe: 'birthdays',
      },
    ];
  },
  subscribe: (listener) => watchLocal('philia:person:', listener),
};
