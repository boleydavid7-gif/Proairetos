import { countText, facts, inYear, shortDay, type Year } from '../../core/year/year';
import type { Plant } from './plants';

/** A year with the plants: waterings, feeds and repots counted (from each plant's tally, else its record), and plants added. */
export function phytonYear(plants: readonly Plant[], year: number): Year {
  const sums = [0, 0, 0];
  for (const plant of plants) {
    const tally = plant.tally?.[String(year)];
    const counts = tally ?? (['water', 'feed', 'repot'] as const).map((kind) => plant.log.filter((entry) => entry.kind === kind && inYear(entry.date, year)).length);
    counts.forEach((n, index) => (sums[index] += n));
  }
  const added = plants.filter((plant) => inYear(plant.createdAt, year)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    facts: facts(
      ['Waterings', sums[0] > 0 && countText(sums[0])],
      ['Feeds', sums[1] > 0 && countText(sums[1])],
      ['Repotted', sums[2] > 0 && countText(sums[2])],
      ['Plants added', added.length > 0 && countText(added.length)],
    ),
    lists: [{ title: 'Added', lines: added.map((plant) => `${shortDay(plant.createdAt.slice(0, 10))} · ${plant.name}`) }].filter((list) => list.lines.length),
  };
}

export const phytonDates = (plants: readonly Plant[]) => [...plants.map((plant) => plant.createdAt), ...plants.flatMap((plant) => [...plant.log.map((entry) => entry.date), ...Object.keys(plant.tally ?? {}).map((year) => `${year}-01-01`)])];
