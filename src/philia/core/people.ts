import { addDays, daysBetween, parseLocalDate } from '../../core/scheduling/dates';

/*
 * Philia keeps the people in someone's life: birthdays and other dates, things to remember, gift ideas and
 * times together. It never ranks people or measures closeness; a keep-in-touch rhythm is the person's own
 * choice, and when it comes round it says how long it has been, nothing more.
 */

export type Line = { id: string; text: string; at: string };
export type Gift = Line & { given?: string };
export type TimeTogether = { id: string; date: string; text: string };
export type PersonDate = { id: string; label: string; date: string };

export type Person = {
  id: string;
  name: string;
  /** "MM-DD", or "YYYY-MM-DD" when the year is known. */
  birthday?: string;
  /** Anniversaries and other dates that come round each year. */
  dates?: PersonDate[];
  relation?: string;
  notes: Line[];
  gifts: Gift[];
  times: TimeTogether[];
  /** Days between being in touch, if the person chose a rhythm. */
  keepInTouch?: number;
  lastInTouch?: string;
  /** The Compass person this came from, if brought in, and the name it had there then. */
  compassId?: string;
  compassName?: string;
  createdAt: string;
};

export function newPerson(id: string, name: string, now: Date): Person {
  return { id, name: name.trim(), notes: [], gifts: [], times: [], createdAt: now.toISOString() };
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[words.length - 1]][0]];
  return letters.join('').toUpperCase();
}

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** The next time a yearly date comes round, today included. 29 February is kept on the 28th in other years. */
export function nextOccurrence(date: string, today: string): string {
  const [month, day] = date.slice(-5).split('-').map(Number);
  const year = Number(today.slice(0, 4));
  const on = (y: number) => {
    const d = month === 2 && day === 29 && !isLeap(y) ? 28 : day;
    return `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const thisYear = on(year);
  return thisYear >= today ? thisYear : on(year + 1);
}

export function yearOf(date: string): number | undefined {
  return date.length === 10 ? Number(date.slice(0, 4)) : undefined;
}

export type ComingUp = { person: Person; label: string; date: string; turning?: number; key: string };

/** Birthdays and dates in the next `days` days, soonest first. */
export function comingUp(people: readonly Person[], today: string, days = 30): ComingUp[] {
  const until = addDays(today, days);
  const all: ComingUp[] = [];
  for (const person of people) {
    if (person.birthday) {
      const date = nextOccurrence(person.birthday, today);
      const born = yearOf(person.birthday);
      if (date <= until) all.push({ person, label: 'Birthday', date, turning: born ? Number(date.slice(0, 4)) - born : undefined, key: `birthday:${person.id}:${date}` });
    }
    for (const each of person.dates ?? []) {
      const date = nextOccurrence(each.date, today);
      const from = yearOf(each.date);
      if (date <= until) all.push({ person, label: each.label || 'Date', date, turning: from ? Number(date.slice(0, 4)) - from : undefined, key: `date:${person.id}:${each.id}:${date}` });
    }
  }
  return all.sort((a, b) => a.date.localeCompare(b.date) || a.person.name.localeCompare(b.person.name));
}

/** "Today", "Tomorrow", "In 5 days", then the date. */
export function whenText(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return `In ${days} days`;
  return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function turningText(entry: Pick<ComingUp, 'label' | 'turning'>): string | undefined {
  if (!entry.turning || entry.turning < 1) return undefined;
  return entry.label === 'Birthday' ? `Turns ${entry.turning}` : `${entry.turning} ${entry.turning === 1 ? 'year' : 'years'}`;
}

/** When the person's own keep-in-touch rhythm next comes round, if they set one. */
export function touchDate(person: Person, today: string): string | undefined {
  if (!person.keepInTouch) return undefined;
  if (!person.lastInTouch) return today;
  return addDays(person.lastInTouch.slice(0, 10), person.keepInTouch);
}

/** People whose rhythm has come round, longest since first. */
export function inTouchNow(people: readonly Person[], today: string): Person[] {
  return people
    .filter((person) => {
      const date = touchDate(person, today);
      return date !== undefined && date <= today;
    })
    .sort((a, b) => (a.lastInTouch ?? '').localeCompare(b.lastInTouch ?? '') || a.name.localeCompare(b.name));
}

/** "Last in touch 3 weeks ago", as a plain fact. */
export function sinceText(date: string | undefined, today: string): string {
  if (!date) return 'No time noted yet';
  const days = daysBetween(date.slice(0, 10), today);
  if (days <= 0) return 'In touch today';
  if (days === 1) return 'In touch yesterday';
  if (days < 14) return `In touch ${days} days ago`;
  if (days < 61) return `In touch ${Math.round(days / 7)} weeks ago`;
  return `In touch ${Math.round(days / 30)} months ago`;
}

export const RHYTHMS: { days: number; label: string }[] = [
  { days: 7, label: 'Every week' },
  { days: 14, label: 'Every two weeks' },
  { days: 30, label: 'Every month' },
  { days: 90, label: 'Every three months' },
  { days: 182, label: 'Every six months' },
];

export function rhythmLabel(days: number | undefined): string {
  if (!days) return 'None';
  return RHYTHMS.find((rhythm) => rhythm.days === days)?.label ?? `Every ${days} days`;
}

/** A birthday as words: "12 October" or "12 October 1990". */
export function dateText(date: string): string {
  const year = yearOf(date);
  const [month, day] = date.slice(-5).split('-').map(Number);
  const value = new Date(2000, month - 1, day);
  const text = value.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  return year ? `${text} ${year}` : text;
}

/** Reads a stored date back into its parts for the form. */
export function dateParts(date: string | undefined): { month: number; day: number; year?: number } | undefined {
  if (!date) return undefined;
  const [month, day] = date.slice(-5).split('-').map(Number);
  return { month, day, year: yearOf(date) };
}

export function datePartsToText(parts: { month: number; day: number; year?: number }): string | undefined {
  const { month, day, year } = parts;
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return year && year > 1000 && year < 3000 ? `${year}-${mmdd}` : mmdd;
}

/** Compass people not yet in Philia (by their link, else by name). */
export function fromCompass(people: readonly Person[], compass: readonly { id: string; body: string; note?: string; inTouchAt?: string }[]): typeof compass {
  const names = new Set(people.map((person) => person.name.trim().toLowerCase()));
  const linked = new Set(people.map((person) => person.compassId).filter(Boolean));
  return compass.filter((each) => each.body.trim() && !linked.has(each.id) && !names.has(each.body.trim().toLowerCase()));
}

/** Words found in search: name, relation, notes, gift ideas, times together. */
export function matches(person: Person, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = [person.name, person.relation, ...person.notes.map((n) => n.text), ...person.gifts.map((g) => g.text), ...person.times.map((t) => t.text)].join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}

export function shortDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.slice(0, 4) === String(new Date().getFullYear()) ? undefined : 'numeric' });
}

/**
 * People brought in from Compass take a new name given there, unless they were renamed here since (then the
 * name here is the person's own choice and stays).
 */
export function followCompass(people: readonly Person[], compass: readonly { id: string; body: string }[]): Person[] {
  const byId = new Map(compass.map((each) => [each.id, each.body.trim()]));
  const changed: Person[] = [];
  for (const person of people) {
    const there = person.compassId ? byId.get(person.compassId) : undefined;
    if (!there || there === person.compassName) continue;
    const untouched = person.compassName === undefined || person.name === person.compassName;
    changed.push(untouched ? { ...person, name: there, compassName: there } : { ...person, compassName: there });
  }
  return changed;
}
