import { watchLocal } from '../../app/family/localChanges';
import { rangeDays, type CalendarLine, type Provider } from '../../core/providers';
import { nextDue, type Thing, type Upkeep } from '../core/things';

const open = (what: string) => `/ktema/?open=${encodeURIComponent(what)}`;

/*
 * A warranty or a document that ends is a deadline on its day; an upkeep that comes round is a date on the day it is next
 * due (and, for a car, by distance, the day the readings estimate). Never serial numbers, prices, stores, manual links,
 * notes, readings or files (manifest, ktema.calendar). The thing stays in Ktema; the line opens it there.
 */
export const ktemaCalendar: Provider<'calendar'> = {
  app: 'ktema',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['local:ktema:thing:', 'local:ktema:upkeep:'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const { first, last } = rangeDays(range);
    const [things, upkeeps] = await Promise.all([ctx.records<Thing>('local:ktema:thing:'), ctx.records<Upkeep>('local:ktema:upkeep:')]);
    const byId = new Map(things.filter((thing) => typeof thing?.id === 'string').map((thing) => [thing.id, thing]));
    const lines: CalendarLine[] = [];
    for (const thing of byId.values()) {
      if (!thing.warrantyUntil || thing.warrantyUntil < first || thing.warrantyUntil > last) continue;
      lines.push({
        ref: { app: 'ktema', kind: 'end', id: thing.id },
        kind: 'deadline',
        title: thing.category === 'Documents' ? `${thing.name}: ends` : `${thing.name}: warranty ends`,
        open: open(`thing:${thing.id}`),
        day: thing.warrantyUntil,
        color: 'sky',
      });
    }
    for (const upkeep of upkeeps) {
      if (typeof upkeep?.id !== 'string') continue;
      const thing = upkeep.thingId ? byId.get(upkeep.thingId) : undefined;
      const date = nextDue(upkeep, thing).date;
      if (!date || date < first || date > last) continue;
      lines.push({
        ref: { app: 'ktema', kind: 'upkeep', id: upkeep.id, occurrence: date },
        kind: 'recurring',
        title: thing ? `${upkeep.name} · ${thing.name}` : upkeep.name,
        open: open(`upkeep:${upkeep.id}`),
        day: date,
        color: 'sky',
      });
    }
    return lines;
  },
  subscribe: (listener) => watchLocal('ktema:', listener),
};
