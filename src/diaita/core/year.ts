import { countText, durationText, facts, inYear, type Year } from '../../core/year/year';
import { sleptMinutes, type SleepRecord } from './rhythm';

/** The nights written down in a year: how many, how long on average, and how they were marked. */
export function diaitaYear(records: readonly SleepRecord[], year: number): Year {
  const nights = records.filter((record) => inYear(record.date, year));
  if (!nights.length) return { facts: [], lists: [] };
  const average = nights.reduce((sum, record) => sum + sleptMinutes(record), 0) / nights.length;
  const marked = (how: SleepRecord['how']) => nights.filter((record) => record.how === how).length;
  return {
    facts: facts(
      ['Nights written down', countText(nights.length)],
      ['Average sleep', durationText(average)],
      ['Marked well', marked('well') > 0 && countText(marked('well'))],
      ['Marked okay', marked('okay') > 0 && countText(marked('okay'))],
      ['Marked poorly', marked('poorly') > 0 && countText(marked('poorly'))],
    ),
    lists: [],
  };
}
