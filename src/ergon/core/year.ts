import { countText, durationText, facts, inYear, type Year } from '../../core/year/year';
import type { Chore } from './chores';

/** Chores done in a year: how many, on how many days, and each chore with how often it was done. */
export function ergonYear(chores: readonly Chore[], year: number): Year {
  const done = chores.flatMap((chore) => chore.history.filter((entry) => inYear(entry.date, year)).map((entry) => ({ ...entry, chore })));
  if (!done.length) return { facts: [], lists: [] };
  const minutes = done.reduce((sum, entry) => sum + (entry.chore.minutes ?? 0), 0);
  const count = (keys: string[]) => {
    const tally = new Map<string, number>();
    for (const key of keys) tally.set(key, (tally.get(key) ?? 0) + 1);
    return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, n]) => `${key}: ${countText(n)}`);
  };
  const by = done.filter((entry) => entry.by).map((entry) => entry.by!);
  return {
    facts: facts(
      ['Chores done', countText(done.length)],
      ['Days', countText(new Set(done.map((entry) => entry.date)).size)],
      ['Time, as noted', minutes > 0 && durationText(minutes)],
    ),
    lists: [
      { title: 'Each chore', lines: count(done.map((entry) => entry.chore.name)) },
      { title: 'Who did them', lines: new Set(by).size > 1 ? count(by) : [] },
    ].filter((list) => list.lines.length),
  };
}

export const ergonDates = (chores: readonly Chore[]) => chores.flatMap((chore) => chore.history.map((entry) => entry.date));
