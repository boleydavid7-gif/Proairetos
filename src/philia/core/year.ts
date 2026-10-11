import { countText, facts, inYear, shortDay, type Year } from '../../core/year/year';
import type { Person } from './people';

/** Times together and gifts given in a year, oldest first, in the person's own words. */
export function philiaYear(people: readonly Person[], year: number): Year {
  const times = people
    .flatMap((person) => person.times.filter((time) => inYear(time.date, year)).map((time) => ({ ...time, name: person.name })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const gifts = people
    .flatMap((person) => person.gifts.filter((gift) => inYear(gift.given, year)).map((gift) => ({ ...gift, given: gift.given!, name: person.name })))
    .sort((a, b) => a.given.localeCompare(b.given));
  const withWhom = new Set(times.map((time) => time.name)).size;
  return {
    facts: facts(
      ['Times together', times.length > 0 && countText(times.length)],
      ['With', withWhom > 0 && (withWhom === 1 ? '1 person' : `${countText(withWhom)} people`)],
      ['Gifts given', gifts.length > 0 && countText(gifts.length)],
    ),
    lists: [
      { title: 'Times together', lines: times.map((time) => `${shortDay(time.date)} · ${time.name}${time.text ? `: ${time.text}` : ''}`) },
      { title: 'Gifts given', lines: gifts.map((gift) => `${shortDay(gift.given)} · ${gift.name}: ${gift.text}`) },
    ].filter((list) => list.lines.length),
  };
}

export const philiaDates = (people: readonly Person[]) => people.flatMap((person) => [...person.times.map((time) => time.date), ...person.gifts.map((gift) => gift.given)]);
