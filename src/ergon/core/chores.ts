import { addDays, daysBetween, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';

/*
 * Ergon keeps the jobs that come round in a home. A chore's next day counts from when it was last done, or
 * falls on the weekdays or day of the month chosen. A day that has come stays the chore's day until it is done
 * or skipped; it is never called late, and nothing piles up: a weekly job done after ten days comes round a
 * week after that, once.
 */

export type Repeat =
  | { kind: 'days'; every: number }
  | { kind: 'weeks'; every: number }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'monthly'; day: number }
  | { kind: 'once' };

export type Done = { date: string; by?: string };

export type Chore = {
  id: string;
  name: string;
  room?: string;
  repeat: Repeat;
  /** Who does it now. */
  who?: string;
  /** Turn by turn: the next name takes it after each time it is done. */
  rota?: string[];
  /** First day, for one never done. */
  start?: string;
  /** Skipped on this day: the next day counts from here. */
  skipped?: string;
  history: Done[];
  note?: string;
  /** Minutes it usually takes, if noted. */
  minutes?: number;
  /** "HH:MM" for this chore's reminder, when it differs from the usual time. */
  remindAt?: string;
  createdAt: string;
};

export const ROOMS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Laundry', 'Outside', 'Car', 'Pets'];

export const IDEAS: { name: string; room: string; repeat: Repeat }[] = [
  { name: 'Bins out', room: 'Outside', repeat: { kind: 'weeks', every: 1 } },
  { name: 'Laundry', room: 'Laundry', repeat: { kind: 'days', every: 4 } },
  { name: 'Change the sheets', room: 'Bedroom', repeat: { kind: 'weeks', every: 2 } },
  { name: 'Vacuum', room: 'Living room', repeat: { kind: 'weeks', every: 1 } },
  { name: 'Clean the bathroom', room: 'Bathroom', repeat: { kind: 'weeks', every: 1 } },
  { name: 'Wipe the fridge', room: 'Kitchen', repeat: { kind: 'weeks', every: 4 } },
  { name: 'Water the plants', room: 'Living room', repeat: { kind: 'days', every: 5 } },
  { name: 'Mop the floors', room: 'Kitchen', repeat: { kind: 'weeks', every: 2 } },
];

export function lastDone(chore: Chore): string | undefined {
  return chore.history.map((done) => done.date).sort().pop();
}

/** The day counting starts from: the later of last done and skipped. */
function anchor(chore: Chore): string | undefined {
  return [lastDone(chore), chore.skipped].filter((date): date is string => Boolean(date)).sort().pop();
}

const weekday = (date: string) => parseLocalDate(date).getDay();

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthDayOnOrAfter(date: string, day: number): string {
  let year = Number(date.slice(0, 4));
  let month = Number(date.slice(5, 7)) - 1;
  for (let step = 0; step < 3; step += 1) {
    const candidate = toLocalDate(new Date(year, month, Math.min(day, lastDayOfMonth(year, month))));
    if (candidate >= date) return candidate;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return date;
}

/** The chore's next day: may be today or a day that has come and is still open. Undefined for a one-off already done. */
export function nextDay(chore: Chore): string | undefined {
  const from = anchor(chore);
  const repeat = chore.repeat;
  if (!from) {
    const start = chore.start ?? toLocalDate(new Date(chore.createdAt));
    if (repeat.kind === 'weekdays' && repeat.days.length) return firstWeekdayFrom(start, repeat.days);
    if (repeat.kind === 'monthly') return monthDayOnOrAfter(start, repeat.day);
    return start;
  }
  switch (repeat.kind) {
    case 'once':
      return undefined;
    case 'days':
      return addDays(from, Math.max(1, repeat.every));
    case 'weeks':
      return addDays(from, 7 * Math.max(1, repeat.every));
    case 'weekdays':
      return repeat.days.length ? firstWeekdayFrom(addDays(from, 1), repeat.days) : addDays(from, 7);
    case 'monthly':
      return monthDayOnOrAfter(addDays(from, 1), repeat.day);
  }
}

function firstWeekdayFrom(date: string, days: readonly number[]): string {
  for (let step = 0; step < 7; step += 1) {
    const candidate = addDays(date, step);
    if (days.includes(weekday(candidate))) return candidate;
  }
  return date;
}

export type Grouped = { now: Chore[]; week: Chore[]; later: Chore[] };

/** Chores whose day has come; then the next seven days; then later. One-offs that are done drop out. */
export function grouped(chores: readonly Chore[], today: string): Grouped {
  const withDay = chores.map((chore) => ({ chore, day: nextDay(chore) })).filter((each): each is { chore: Chore; day: string } => Boolean(each.day));
  withDay.sort((a, b) => a.day.localeCompare(b.day) || a.chore.name.localeCompare(b.chore.name));
  const week = addDays(today, 7);
  return {
    now: withDay.filter((each) => each.day <= today).map((each) => each.chore),
    week: withDay.filter((each) => each.day > today && each.day <= week).map((each) => each.chore),
    later: withDay.filter((each) => each.day > week).map((each) => each.chore),
  };
}

/** Marks a chore done today: the day is kept, and a rota passes it to the next name. */
export function markDone(chore: Chore, today: string, by?: string): Chore {
  const history = [...chore.history, { date: today, by: by ?? chore.who }].slice(-30);
  let who = chore.who;
  if (chore.rota && chore.rota.length > 1) {
    const at = chore.rota.indexOf(chore.who ?? '');
    who = chore.rota[(at + 1) % chore.rota.length];
  }
  return { ...chore, history, who, skipped: undefined };
}

/** Not this time: the next day counts from today, nothing recorded as done. */
export function skip(chore: Chore, today: string): Chore {
  return { ...chore, skipped: today };
}

/** "Today", "Tomorrow", "Fri", "12 Oct"; a day that has come says since when, never "late". */
export function dayText(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'Today';
  if (days < 0) return days === -1 ? 'Since yesterday' : `Since ${parseLocalDate(date).toLocaleDateString(undefined, days > -7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' })}`;
  if (days === 1) return 'Tomorrow';
  if (days < 7) return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short' });
  return parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const WEEKDAY_NAMES = Array.from({ length: 7 }, (_, index) => new Date(2026, 0, 4 + index).toLocaleDateString(undefined, { weekday: 'short' }));

export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[day];
}

export function repeatText(repeat: Repeat): string {
  switch (repeat.kind) {
    case 'once':
      return 'Once';
    case 'days':
      return repeat.every === 1 ? 'Every day' : `Every ${repeat.every} days`;
    case 'weeks':
      return repeat.every === 1 ? 'Every week' : `Every ${repeat.every} weeks`;
    case 'weekdays':
      return repeat.days.length === 7 ? 'Every day' : [...repeat.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(weekdayName).join(', ');
    case 'monthly':
      return repeat.day >= 31 ? 'Last day of the month' : `Monthly on the ${ordinal(repeat.day)}`;
  }
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** Plain facts: times done in the last 30 days, by name. */
export function whoDidWhat(chores: readonly Chore[], today: string): { name: string; times: number }[] {
  const from = addDays(today, -30);
  const counts = new Map<string, number>();
  for (const chore of chores) {
    for (const done of chore.history) {
      if (done.date <= from || !done.by) continue;
      counts.set(done.by, (counts.get(done.by) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, times]) => ({ name, times })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Names used anywhere in the home, for choosing who. */
export function namesIn(chores: readonly Chore[], extra: readonly string[] = []): string[] {
  const names = new Set<string>(extra.filter(Boolean));
  for (const chore of chores) {
    if (chore.who) names.add(chore.who);
    for (const name of chore.rota ?? []) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
