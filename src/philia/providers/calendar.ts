import { watchLocal } from '../../app/family/localChanges';
import { localDayOf, rangeDays, type CalendarLine, type Provider } from '../../core/providers';
import { nextOccurrence, type Person } from '../core/people';

const open = (person: string) => `/philia/?open=${encodeURIComponent(`person:${person}`)}`;
const inRange = (date: string, first: string, last: string) => date >= first && date <= last;

/*
 * People's dates: a birthday or other yearly date on each day it comes round inside the range, a one-time date on its day,
 * and a one-time event with a time as an hour-long entry. Never a phone number, an email, notes, gift ideas or times
 * together (manifest, philia.calendar). The person stays in Philia; a line opens them there.
 */
export const philiaCalendar: Provider<'calendar'> = {
  app: 'philia',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['local:philia:person:'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const { first, last } = rangeDays(range);
    const years: number[] = [];
    for (let year = Number(first.slice(0, 4)); year <= Number(last.slice(0, 4)); year += 1) years.push(year);
    /** The days in the range a yearly date falls on (29 February is kept on the 28th in other years). */
    const comes = (date: string) => years.map((year) => nextOccurrence(date, `${year}-01-01`)).filter((day) => inRange(day, first, last));
    const lines: CalendarLine[] = [];
    const owner = new Map<CalendarLine, string>();
    const add = (line: CalendarLine, name: string) => { owner.set(line, name); lines.push(line); };
    for (const person of await ctx.records<Person>('local:philia:person:')) {
      if (typeof person?.id !== 'string') continue;
      if (person.birthday) {
        for (const day of comes(person.birthday)) {
          add({ ref: { app: 'philia', kind: 'birthday', id: person.id, occurrence: day }, kind: 'recurring', title: `${person.name}’s birthday`, open: open(person.id), day, color: 'rose' }, person.name);
        }
      }
      for (const each of person.dates ?? []) {
        if (each.once) {
          if (each.time) {
            const start = new Date(`${each.date}T${each.time}:00`);
            if (Number.isNaN(start.getTime())) continue;
            const end = new Date(start.getTime() + 60 * 60_000);
            if (end <= range.from || start >= range.until) continue;
            add({ ref: { app: 'philia', kind: 'event', id: `${person.id}:${each.id}` }, kind: 'event', title: `${each.label || 'Event'} · ${person.name}`, open: open(person.id), day: localDayOf(start), start, end }, person.name);
          } else if (inRange(each.date, first, last)) {
            add({ ref: { app: 'philia', kind: 'date', id: `${person.id}:${each.id}` }, kind: 'info', title: `${person.name}: ${each.label || 'Event'}`, open: open(person.id), day: each.date, color: 'rose' }, person.name);
          }
          continue;
        }
        for (const day of comes(each.date)) {
          const label = each.label || 'Date';
          add({
            ref: { app: 'philia', kind: 'date', id: `${person.id}:${each.id}`, occurrence: day },
            kind: 'recurring',
            title: label === 'Birthday' ? `${person.name}’s birthday` : `${person.name}: ${label}`,
            open: open(person.id),
            day,
            color: 'rose',
          }, person.name);
        }
      }
    }
    // Soonest first, then by the person's name, as the dates have always been listed; a person's own order is kept.
    return lines
      .map((line, index) => ({ line, index }))
      .sort((a, b) => a.line.day.localeCompare(b.line.day) || (owner.get(a.line) ?? '').localeCompare(owner.get(b.line) ?? '') || a.index - b.index)
      .map(({ line }) => line);
  },
  subscribe: (listener) => watchLocal('philia:person:', listener),
};
