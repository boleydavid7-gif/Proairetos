import { countText, facts, inYear, shortDay, type Year } from '../../core/year/year';
import { withWho, type Appointment } from './medicines';
import { kindName, type Reading } from './readings';

/** Visits and readings in a year, as counts and dates. Doses are left out: what was taken is the person's own. */
export function therapeiaYear(visits: readonly Appointment[], readings: readonly Reading[], year: number, now = new Date()): Year {
  const seen = visits.filter((visit) => inYear(visit.at, year) && new Date(visit.at) <= now).sort((a, b) => a.at.localeCompare(b.at));
  const kept = readings.filter((reading) => inYear(reading.at, year));
  const questions = seen.reduce((sum, visit) => sum + visit.questions.length, 0);
  const kinds = new Map<string, number>();
  for (const reading of kept) kinds.set(kindName(reading), (kinds.get(kindName(reading)) ?? 0) + 1);
  return {
    facts: facts(
      ['Visits', seen.length > 0 && countText(seen.length)],
      ['Questions taken along', questions > 0 && countText(questions)],
      ['Readings', kept.length > 0 && countText(kept.length)],
    ),
    lists: [
      { title: 'Visits', lines: seen.map((visit) => `${shortDay(visit.at)} · ${withWho(visit, visit.with)}`) },
      { title: 'Readings', lines: [...kinds].sort((a, b) => a[0].localeCompare(b[0])).map(([name, n]) => `${name}: ${countText(n)}`) },
    ].filter((list) => list.lines.length),
  };
}
