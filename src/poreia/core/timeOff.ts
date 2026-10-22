import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import type { TimeBlock } from '../../core/scheduling/types';

/*
 * Time off, counted in hours as most employers keep it. The person says what the balance was on a day and how it grows
 * (so many hours every week, two weeks, half month, month or year, from a first date, up to an optional cap). Time off
 * takes hours from the balance; the hours a stretch takes come from the work shifts in Proairetos on those days, or, with
 * no work schedule there, from the hours the person gives a usual day off. Nothing is decided for the person: a request
 * moves from planned to requested to approved only when they say so, and only approved time off replaces work shifts.
 */

export type AccrualEvery = 'none' | 'week' | 'two-weeks' | 'half-month' | 'month' | 'year';

export const ACCRUAL_CHOICES: { id: AccrualEvery; label: string }[] = [
  { id: 'none', label: 'It doesn’t grow' },
  { id: 'week', label: 'Every week' },
  { id: 'two-weeks', label: 'Every two weeks' },
  { id: 'half-month', label: 'Twice a month' },
  { id: 'month', label: 'Every month' },
  { id: 'year', label: 'Every year' },
];

export type TimeOffSetup = {
  /** Hours on hand on `asOf`. */
  balance: number;
  asOf: string;
  accrual: number;
  every: AccrualEvery;
  /** The first day hours are added on; later ones follow the rhythm from it. */
  from: string;
  /** The most the balance can hold, if there is a cap. */
  cap?: number;
  /** Hours one day off takes when Proairetos has no work shifts that day (and no schedule at all). */
  dayHours: number;
  /** With no work schedule in Proairetos: the weekdays (0 Sunday … 6 Saturday) a day off counts on. Empty = every day. */
  workDays: number[];
  /** Hours a full week off takes; unset = the usual day times the work days (five when none are chosen). */
  weekHours?: number;
};

/** A full week off, as the person set it or from the usual day. */
export const fullWeekHours = (setup: Pick<TimeOffSetup, 'dayHours' | 'workDays' | 'weekHours'>): number => setup.weekHours ?? round(setup.dayHours * (setup.workDays.length || 5));

export type TimeOffStatus = 'planned' | 'requested' | 'approved' | 'canceled';

export const STATUS_LABEL: Record<TimeOffStatus, string> = {
  planned: 'Planned',
  requested: 'Requested',
  approved: 'Approved',
  canceled: 'Canceled',
};

/** A work shift Poreia took off the Proairetos schedule for approved time off, and what that day had before. */
export type Replaced = { patternId: string; date: string; previous: TimeBlock[] | null };

export type TimeOff = {
  id: string;
  tripId?: string;
  title: string;
  start: string;
  end: string;
  status: TimeOffStatus;
  /** Hours it takes, as last counted (or as the person set them). */
  hours: number;
  /** The person typed the hours themselves; recounting leaves them. */
  hoursSet?: boolean;
  /** Shifts taken off Proairetos's schedule while approved; put back if it is canceled or moved. */
  replaced?: Replaced[];
  note?: string;
  createdAt: string;
  updatedAt: string;
};

/** The days an accrual lands on, after `after` and up to and including `until`. */
export function accrualDates(setup: Pick<TimeOffSetup, 'every' | 'from'>, after: string, until: string): string[] {
  if (setup.every === 'none' || !setup.from || until <= after) return [];
  const out: string[] = [];
  const start = parseLocalDate(setup.from);
  for (let n = 0; out.length < 2000; n += 1) {
    let date: string;
    if (setup.every === 'week' || setup.every === 'two-weeks') {
      date = addDays(setup.from, n * (setup.every === 'week' ? 7 : 14));
    } else if (setup.every === 'half-month') {
      // The first day's date and fifteen days later, each month (the 31st falls back to the month's last day).
      const month = Math.floor(n / 2);
      const day = n % 2 === 0 ? start.getDate() : Math.min(start.getDate() + 15, 31);
      date = monthDay(start.getFullYear(), start.getMonth() + month, day);
    } else if (setup.every === 'month') {
      date = monthDay(start.getFullYear(), start.getMonth() + n, start.getDate());
    } else {
      date = monthDay(start.getFullYear() + n, start.getMonth(), start.getDate());
    }
    if (date > until) break;
    if (date > after) out.push(date);
  }
  return out;
}

function monthDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  const date = new Date(year, month, Math.min(day, last), 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Which kinds of time off count against the balance. Planned ones count only when asked (to see what would be left). */
const counts = (off: TimeOff, withPlanned: boolean) => off.status === 'approved' || off.status === 'requested' || (withPlanned && off.status === 'planned');

/**
 * Hours on hand at the end of `date`: the balance on `asOf`, plus every accrual since (held under the cap), less the
 * time off that starts after `asOf` and by `date`. Time off before `asOf` is already in the balance the person gave.
 */
export function balanceOn(setup: TimeOffSetup, offs: readonly TimeOff[], date: string, withPlanned = false): number {
  type Step = { date: string; hours: number; accrual: boolean };
  const steps: Step[] = [
    ...accrualDates(setup, setup.asOf, date).map((day) => ({ date: day, hours: setup.accrual, accrual: true })),
    ...offs.filter((off) => counts(off, withPlanned) && off.start > setup.asOf && off.start <= date).map((off) => ({ date: off.start, hours: -off.hours, accrual: false })),
  ];
  // On one day, hours taken come off before that day's accrual is added (the cap applies after it).
  steps.sort((a, b) => a.date.localeCompare(b.date) || Number(a.accrual) - Number(b.accrual));
  let balance = setup.balance;
  for (const step of steps) {
    const before = balance;
    balance += step.hours;
    // An accrual never lifts the balance past the cap (a balance already over it stays as it was).
    if (step.accrual && setup.cap !== undefined && balance > setup.cap) balance = Math.max(before, setup.cap);
  }
  return round(balance);
}

const round = (hours: number) => Math.round(hours * 100) / 100;

/** What a stretch of time off leaves: the balance the day before it, and after it with everything planned before it too. */
export function leftAfter(setup: TimeOffSetup, offs: readonly TimeOff[], off: Pick<TimeOff, 'id' | 'start' | 'hours'>): { before: number; after: number } {
  const others = offs.filter((each) => each.id !== off.id);
  const before = balanceOn(setup, others, addDays(off.start, -1), true);
  const atStart = balanceOn(setup, others, off.start, true);
  return { before, after: round(atStart - off.hours) };
}

/** One work shift as Poreia sees it: its pattern, its day and how long it is. */
export type Shift = { patternId: string; date: string; hours: number };

/**
 * Hours a stretch of days off takes. Each whole week of it (seven days from the first) takes a full week off; the days
 * left over take their work shifts when Proairetos has a work schedule, else the usual day's hours on the person's work
 * days (every day when none are chosen). Public holidays take nothing: a holiday in a whole week comes off the week.
 */
export function hoursFor(
  start: string,
  end: string,
  shifts: readonly Shift[],
  setup: Pick<TimeOffSetup, 'dayHours' | 'workDays' | 'weekHours'>,
  hasSchedule: boolean,
  holidays: ReadonlySet<string> = new Set(),
): number {
  if (end < start) return 0;
  const usualDay = (date: string) => setup.workDays.length === 0 || setup.workDays.includes(parseLocalDate(date).getDay());
  const dayHours = (date: string) =>
    hasSchedule ? shifts.filter((shift) => shift.date === date).reduce((sum, shift) => sum + shift.hours, 0) : usualDay(date) ? setup.dayHours : 0;
  // What a holiday in a whole week takes off it: that day's shift, else a usual day when it falls on one.
  const holidayHours = (date: string) => (hasSchedule && shifts.some((shift) => shift.date === date) ? dayHours(date) : usualDay(date) ? setup.dayHours : 0);
  const days = Math.round((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / 86_400_000) + 1;
  const weeks = Math.floor(days / 7);
  let hours = 0;
  let date = start;
  for (let week = 0; week < weeks; week += 1) {
    let off = 0;
    for (let day = 0; day < 7; day += 1, date = addDays(date, 1)) if (holidays.has(date)) off += holidayHours(date);
    hours += Math.max(0, fullWeekHours(setup) - off);
  }
  for (; date <= end; date = addDays(date, 1)) if (!holidays.has(date)) hours += dayHours(date);
  return round(hours);
}

/** "40 h", "7.5 h", "1 h". */
export const hoursText = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(hours * 10 === Math.round(hours * 10) ? 1 : 2)} h`;

/** "5 days" from hours, using the usual day, for a second reading of a balance. */
export const daysText = (hours: number, dayHours: number) => {
  if (!dayHours) return '';
  const days = Math.round((hours / dayHours) * 10) / 10;
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};

/** The work shifts approved time off would take off the schedule: one per pattern and day. */
export function shiftsToReplace(start: string, end: string, shifts: readonly Shift[]): { patternId: string; date: string }[] {
  const seen = new Set<string>();
  const out: { patternId: string; date: string }[] = [];
  for (const shift of shifts) {
    if (shift.date < start || shift.date > end) continue;
    const key = `${shift.patternId}:${shift.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ patternId: shift.patternId, date: shift.date });
  }
  return out;
}

/** Days of the year with time off on them, by status, for the year view. */
export function daysOff(offs: readonly TimeOff[], year: number): Map<string, TimeOffStatus> {
  const map = new Map<string, TimeOffStatus>();
  const rank: Record<TimeOffStatus, number> = { approved: 3, requested: 2, planned: 1, canceled: 0 };
  for (const off of offs) {
    if (off.status === 'canceled') continue;
    for (let date = off.start; date <= off.end; date = addDays(date, 1)) {
      if (!date.startsWith(`${year}-`)) continue;
      const before = map.get(date);
      if (!before || rank[off.status] > rank[before]) map.set(date, off.status);
    }
  }
  return map;
}

export const defaultSetup = (today: string): TimeOffSetup => ({ balance: 0, asOf: today, accrual: 0, every: 'none', from: today, dayHours: 8, workDays: [] });
