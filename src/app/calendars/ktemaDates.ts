import { nextDue, type Thing, type Upkeep } from '../../ktema/core/things';

/*
 * Ktema's dates, read only, as quiet lines on their day in Days ahead: a warranty or a document that ends, and an
 * upkeep that comes round. The records are read from storage (`useStoredRecords`), so no other app's code loads here.
 */

export type KtemaLine = { id: string; name: string; href: string };

export function ktemaDatesOn(things: readonly Thing[], upkeeps: readonly Upkeep[], date: string): KtemaLine[] {
  const out: KtemaLine[] = [];
  for (const thing of things) {
    if (thing.warrantyUntil !== date) continue;
    out.push({
      id: `ktema:end:${thing.id}`,
      name: thing.category === 'Documents' ? `${thing.name}: ends` : `${thing.name}: warranty ends`,
      href: `/ktema/?open=${encodeURIComponent(`thing:${thing.id}`)}`,
    });
  }
  const byId = new Map(things.map((thing) => [thing.id, thing]));
  for (const upkeep of upkeeps) {
    const thing = upkeep.thingId ? byId.get(upkeep.thingId) : undefined;
    if (nextDue(upkeep, thing).date !== date) continue;
    out.push({
      id: `ktema:upkeep:${upkeep.id}`,
      name: thing ? `${upkeep.name} · ${thing.name}` : upkeep.name,
      href: `/ktema/?open=${encodeURIComponent(`upkeep:${upkeep.id}`)}`,
    });
  }
  return out;
}
