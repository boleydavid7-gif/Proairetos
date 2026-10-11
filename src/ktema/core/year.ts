import { countText, facts, inYear, shortDay, type Year } from '../../core/year/year';
import type { Thing, Upkeep } from './things';

/** Upkeep done and things bought in a year, oldest first, with costs as they were written. */
export function ktemaYear(things: readonly Thing[], upkeeps: readonly Upkeep[], year: number): Year {
  const nameOf = (id?: string) => things.find((thing) => thing.id === id)?.name;
  const done = upkeeps
    .flatMap((upkeep) => upkeep.history.filter((entry) => !entry.skipped && inYear(entry.date, year)).map((entry) => ({ ...entry, upkeep })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const bought = things.filter((thing) => inYear(thing.boughtOn, year)).sort((a, b) => a.boughtOn!.localeCompare(b.boughtOn!));
  return {
    facts: facts(
      ['Upkeep done', done.length > 0 && countText(done.length)],
      ['With a cost noted', done.some((entry) => entry.cost) && countText(done.filter((entry) => entry.cost).length)],
      ['Things bought', bought.length > 0 && countText(bought.length)],
    ),
    lists: [
      {
        title: 'Upkeep',
        lines: done.map((entry) => {
          const thing = nameOf(entry.upkeep.thingId);
          return `${shortDay(entry.date)} · ${entry.upkeep.name}${thing ? ` (${thing})` : ''}${entry.cost ? ` · ${entry.cost}` : ''}`;
        }),
      },
      { title: 'Bought', lines: bought.map((thing) => `${shortDay(thing.boughtOn!)} · ${thing.name}${thing.price ? ` · ${thing.price}` : ''}`) },
    ].filter((list) => list.lines.length),
  };
}

export const ktemaDates = (things: readonly Thing[], upkeeps: readonly Upkeep[]) => [...things.map((thing) => thing.boughtOn), ...upkeeps.flatMap((upkeep) => upkeep.history.map((entry) => entry.date))];
