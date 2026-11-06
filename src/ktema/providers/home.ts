import { watchLocal } from '../../app/family/localChanges';
import { homeDayText, sinceText, type Provider } from '../../core/providers';
import { grouped, markDone, type Thing, type Upkeep } from '../core/things';
import { putUpkeep, upkeeps } from '../app/state';

/*
 * Upkeep that has come round: its name, the thing it is for and since when. Never serial numbers, prices, warranty
 * details or notes (manifest, ktema.home). A pull to the left marks it done in Ktema, with an undo.
 */
export const ktemaHome: Provider<'home'> = {
  app: 'ktema',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ktema:upkeep:', 'local:ktema:thing:'],
  async read(ctx) {
    const [all, owned] = await Promise.all([ctx.records<Upkeep>('local:ktema:upkeep:'), ctx.records<Thing>('local:ktema:thing:')]);
    const things = owned.filter((thing) => typeof thing.id === 'string');
    return grouped(all.filter((upkeep) => typeof upkeep.id === 'string'), things, ctx.today).now.map(({ upkeep, due }) => ({
      ref: { app: 'ktema' as const, kind: 'upkeep', id: upkeep.id },
      group: 'attention' as const,
      title: upkeep.name,
      detail: [things.find((thing) => thing.id === upkeep.thingId)?.name, sinceText(homeDayText(due.date, ctx.today))].filter(Boolean).join(' · '),
      open: `/ktema/?open=${encodeURIComponent(`upkeep:${upkeep.id}`)}`,
      swipe: { id: `upkeep:${upkeep.id}`, word: 'Done', marks: true },
    }));
  },
  act(ref, today) {
    const before = upkeeps.get(ref.id);
    if (!before) return () => undefined;
    putUpkeep(markDone(before, today));
    return () => putUpkeep(before);
  },
  subscribe(listener) {
    const offs = ['ktema:upkeep:', 'ktema:thing:'].map((prefix) => watchLocal(prefix, listener));
    return () => offs.forEach((off) => off());
  },
};
