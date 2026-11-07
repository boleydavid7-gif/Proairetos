import { countText, facts, inYear, type Year } from '../../core/year/year';
import { activities, type LogEntry } from './log';
import { formatDistance, formatHours, type Unit } from './pace';

/** What was logged in a year: how often, on how many days, how long and how far, and each kind of activity. */
export function askesisYear(entries: readonly LogEntry[], year: number, unit: Unit): Year {
  const kept = entries.filter((entry) => inYear(entry.date, year));
  if (!kept.length) return { facts: [], lists: [] };
  const seconds = kept.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0);
  const meters = kept.reduce((sum, entry) => sum + (entry.meters ?? 0), 0);
  const longest = Math.max(0, ...kept.map((entry) => entry.meters ?? 0));
  const byKind = new Map<string, number>();
  for (const entry of kept) byKind.set(activities[entry.activity], (byKind.get(activities[entry.activity]) ?? 0) + 1);
  return {
    facts: facts(
      ['Logged', countText(kept.length)],
      ['Days', countText(new Set(kept.map((entry) => entry.date)).size)],
      ['Time', seconds > 0 && formatHours(seconds)],
      ['Distance', meters > 0 && formatDistance(meters, unit)],
      ['Longest', longest > 0 && formatDistance(longest, unit)],
    ),
    lists: byKind.size > 1 ? [{ title: 'Each kind', lines: [...byKind].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => `${name}: ${countText(n)}`) }] : [],
  };
}
