import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import type { Thing, Upkeep } from '../core/things';

/*
 * Things and upkeep: names, make and model, place and the person's notes. Not serial numbers, prices or warranty details
 * (manifest, ktema.search).
 */
export const ktemaSearch: Provider<'search'> = {
  app: 'ktema',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ktema:thing:', 'local:ktema:upkeep:'],
  async read(ctx) {
    const things = (await ctx.records<Thing>('local:ktema:thing:')).filter((thing) => typeof thing.id === 'string');
    const upkeeps = (await ctx.records<Upkeep>('local:ktema:upkeep:')).filter((upkeep) => typeof upkeep.id === 'string');
    return [
      ...things.map((thing) => ({
        ref: { app: 'ktema' as const, kind: 'thing', id: thing.id },
        title: thing.name,
        titleField: 'thing name',
        fields: present(
          { name: 'make and model', text: [thing.make, thing.model].filter(Boolean).join(' ') },
          { name: 'place', text: thing.place },
          { name: 'thing note', text: thing.note },
        ),
        at: thing.createdAt,
        label: 'In Ktema',
        open: `/ktema/?open=${encodeURIComponent(`thing:${thing.id}`)}`,
      })),
      ...upkeeps.map((upkeep) => ({
        ref: { app: 'ktema' as const, kind: 'upkeep', id: upkeep.id },
        title: upkeep.name,
        titleField: 'upkeep name',
        fields: present({ name: 'upkeep note', text: upkeep.note }),
        at: upkeep.createdAt,
        label: 'Upkeep in Ktema',
        open: `/ktema/?open=${encodeURIComponent(`upkeep:${upkeep.id}`)}`,
      })),
    ];
  },
  subscribe(listener) {
    const offThings = watchLocal('ktema:thing:', listener);
    const offUpkeeps = watchLocal('ktema:upkeep:', listener);
    return () => {
      offThings();
      offUpkeeps();
    };
  },
};
