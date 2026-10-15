import { addDays, atTime, daysBetween, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { Sleep } from '../../diaita/core/rhythm';

/*
 * Therapeia keeps the person's medicines as they were prescribed or chosen, and a plain record of what was taken.
 * A dose is at a clock time, or a time after waking or before sleep, so on a changing schedule (nights, early
 * starts) it moves with the person's sleep. Nothing is judged: a dose not marked simply passes with its day.
 * Therapeia never suggests a dose, a time or a change; it only reminds and records what the person set.
 */

export type DoseTime =
  | { kind: 'clock'; at: string }
  /** Minutes after waking (0 = on waking). */
  | { kind: 'wake'; after: number }
  /** Minutes before sleep (0 = at bedtime). */
  | { kind: 'sleep'; before: number };

export type DoseDays = { kind: 'daily' } | { kind: 'weekdays'; days: number[] } | { kind: 'every'; every: number };

/** One dose marked: `slot` is `DATE#INDEX` for a planned dose, `extra:ISO` for one taken as needed. */
export type Taken = { slot: string; at: string; skipped?: boolean };

export type Supply = {
  /** How many were on hand when last counted. */
  count: number;
  /** When they were counted (ISO). Doses marked taken since then come off. */
  countedAt: string;
  /** How many each dose uses. */
  perDose: number;
  /** Remind this many days before they would run out. */
  lead: number;
};

export const PILL_SHAPES = ['round', 'oval', 'capsule', 'liquid', 'drops', 'inhaler', 'patch', 'injection'] as const;
export type PillShape = (typeof PILL_SHAPES)[number];
export const PILL_COLORS: Record<string, string> = {
  white: '#f1efe9',
  cream: '#e8dcbc',
  yellow: '#e6c54a',
  orange: '#e3954a',
  pink: '#e9a2b6',
  red: '#c9504a',
  purple: '#a58ad0',
  blue: '#6a9ad8',
  green: '#6fb08a',
  brown: '#9a6f4e',
};
/** How the medicine looks, so it is known at a glance. */
export type PillLook = { shape: PillShape; color: string; color2?: string };

export type Medicine = {
  id: string;
  name: string;
  look?: PillLook;
  /** As written on the label: "1 tablet", "10 mg", "2 puffs". */
  dose?: string;
  /** "With food", "Not with milk". */
  how?: string;
  note?: string;
  /** Empty when taken only as needed. */
  times: DoseTime[];
  days: DoseDays;
  start: string;
  /** Last day of a course. */
  end?: string;
  /** Taken when needed, as well as or instead of at set times. */
  asNeeded?: boolean;
  /** The person's own spacing for as-needed doses, in hours ("at least 4 hours apart"). */
  gapHours?: number;
  supply?: Supply;
  taken: Taken[];
  /** No longer taken, from this day; kept with its record. */
  stopped?: string;
  /** What changed and when, written on each save (`changesOf`), newest last. */
  changes?: Change[];
  createdAt: string;
};

/** One change to a medicine, as a plain record for the person, a pharmacist or a doctor. */
export type Change = { on: string; what: 'started' | 'dose' | 'schedule' | 'course' | 'stopped' | 'restarted' | 'refilled'; from?: string; to?: string };

export type Appointment = {
  id: string;
  /** Who or what: "Dr Patel", "Blood test". */
  with: string;
  /** Local "YYYY-MM-DDTHH:MM". */
  at: string;
  where?: string;
  questions: { id: string; text: string; asked?: boolean }[];
  /** What was said, written afterwards. */
  notes?: string;
  createdAt: string;
};

export type Anchors = (date: string) => { wake?: Date; sleep?: Date };

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The person's waking and sleep for each day, from Diaita's plan around their schedule. */
export function anchorsFrom(sleeps: readonly Sleep[]): Anchors {
  const sorted = [...sleeps].sort((a, b) => a.start.getTime() - b.start.getTime());
  return (date) => {
    // Woken into the day: the first main sleep that ends on it.
    const woke = sorted.filter((sleep) => toLocalDate(sleep.end) === date).sort((a, b) => a.end.getTime() - b.end.getTime())[0];
    const wake = woke?.end;
    // Asleep at the end of it: the first main sleep that begins some hours after waking.
    const from = wake ? wake.getTime() + 4 * 3_600_000 : parseLocalDate(date).getTime() + 12 * 3_600_000;
    const next = sorted.find((sleep) => sleep.start.getTime() >= from);
    const sleep = next && next.start.getTime() - from < 30 * 3_600_000 ? next.start : undefined;
    return { wake, sleep };
  };
}

/** Whether the medicine has doses on this day. */
export function isDoseDay(medicine: Medicine, date: string): boolean {
  if (date < medicine.start) return false;
  if (medicine.end && date > medicine.end) return false;
  if (medicine.stopped && date >= medicine.stopped) return false;
  switch (medicine.days.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return medicine.days.days.includes(parseLocalDate(date).getDay());
    case 'every':
      return daysBetween(medicine.start, date) % Math.max(1, medicine.days.every) === 0;
  }
}

export function timeText(time: DoseTime): string {
  switch (time.kind) {
    case 'clock':
      return clockText(time.at);
    case 'wake':
      return time.after === 0 ? 'On waking' : `${durationText(time.after)} after waking`;
    case 'sleep':
      return time.before === 0 ? 'At bedtime' : `${durationText(time.before)} before sleep`;
  }
}

export function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${Math.floor(hours)} h ${minutes % 60} min`;
}

export function clockText(hhmm: string): string {
  const [hour, minute] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** When a dose time falls on a day. A waking or sleep time with no sleep known falls back to 07:00 and 22:30. */
export function doseAt(time: DoseTime, date: string, anchors?: Anchors): Date {
  if (time.kind === 'clock') return atTime(date, time.at);
  const known = anchors?.(date);
  if (time.kind === 'wake') return new Date((known?.wake ?? atTime(date, '07:00')).getTime() + time.after * 60_000);
  return new Date((known?.sleep ?? atTime(date, '22:30')).getTime() - time.before * 60_000);
}

export type Dose = { medicine: Medicine; slot: string; date: string; index: number; at: Date; label: string; taken?: Taken };

/** The planned doses of one day (the person's day), soonest first, each with how it was marked. */
export function dosesOn(medicines: readonly Medicine[], date: string, anchors?: Anchors): Dose[] {
  const doses: Dose[] = [];
  for (const medicine of medicines) {
    if (!isDoseDay(medicine, date)) continue;
    medicine.times.forEach((time, index) => {
      const slot = `${date}#${index}`;
      doses.push({ medicine, slot, date, index, at: doseAt(time, date, anchors), label: timeText(time), taken: medicine.taken.find((each) => each.slot === slot) });
    });
  }
  return doses.sort((a, b) => a.at.getTime() - b.at.getTime() || a.medicine.name.localeCompare(b.medicine.name));
}

/** Every planned dose from one day to another, for reminders. */
export function dosesBetween(medicines: readonly Medicine[], from: string, until: string, anchors?: Anchors): Dose[] {
  const doses: Dose[] = [];
  for (let date = from; date <= until; date = addDays(date, 1)) doses.push(...dosesOn(medicines, date, anchors));
  return doses;
}

function mark(medicine: Medicine, entry: Taken): Medicine {
  return { ...medicine, taken: [...medicine.taken.filter((each) => each.slot !== entry.slot), entry] };
}

export function take(medicine: Medicine, slot: string, at: Date): Medicine {
  return mark(medicine, { slot, at: at.toISOString() });
}

export function skip(medicine: Medicine, slot: string, at: Date): Medicine {
  return mark(medicine, { slot, at: at.toISOString(), skipped: true });
}

export function unmark(medicine: Medicine, slot: string): Medicine {
  return { ...medicine, taken: medicine.taken.filter((each) => each.slot !== slot) };
}

/** A dose taken as needed, at this moment. */
export function takeNow(medicine: Medicine, at: Date): Medicine {
  return mark(medicine, { slot: `extra:${at.toISOString()}`, at: at.toISOString() });
}

export function lastTaken(medicine: Medicine): Date | undefined {
  const last = medicine.taken.filter((each) => !each.skipped).map((each) => each.at).sort().pop();
  return last ? new Date(last) : undefined;
}

/** For an as-needed medicine with the person's own spacing: the time from which, by that spacing, another could be taken. */
export function spacedFrom(medicine: Medicine): Date | undefined {
  const last = lastTaken(medicine);
  if (!last || !medicine.gapHours) return undefined;
  return new Date(last.getTime() + medicine.gapHours * 3_600_000);
}

/** About how many doses a day, on average, for supply. */
export function dosesPerDay(medicine: Medicine): number {
  const count = medicine.times.length;
  switch (medicine.days.kind) {
    case 'daily':
      return count;
    case 'weekdays':
      return (count * medicine.days.days.length) / 7;
    case 'every':
      return count / Math.max(1, medicine.days.every);
  }
}

/** How many are left: the last count less what was marked taken since. */
export function supplyLeft(medicine: Medicine): number | undefined {
  const supply = medicine.supply;
  if (!supply) return undefined;
  const used = medicine.taken.filter((each) => !each.skipped && each.at >= supply.countedAt).length * supply.perDose;
  return Math.max(0, supply.count - used);
}

/** About how many days the supply lasts at the planned doses (undefined when taken only as needed). */
export function daysLeft(medicine: Medicine): number | undefined {
  const left = supplyLeft(medicine);
  const perDay = dosesPerDay(medicine) * (medicine.supply?.perDose ?? 1);
  if (left === undefined || perDay <= 0) return undefined;
  return Math.floor(left / perDay);
}

/** The day to be reminded about a refill: `lead` days before the supply would run out. */
export function refillDay(medicine: Medicine, today: string): string | undefined {
  const days = daysLeft(medicine);
  if (days === undefined || !medicine.supply || medicine.stopped) return undefined;
  const runsOut = addDays(today, days);
  if (medicine.end && runsOut > medicine.end) return undefined;
  const day = addDays(runsOut, -Math.max(0, medicine.supply.lead));
  return day < today ? today : day;
}

/** A refill: what was brought home is added to what is left, and counting starts again from now. */
export function refill(medicine: Medicine, added: number, now: Date): Medicine {
  if (!medicine.supply) return medicine;
  return { ...medicine, supply: { ...medicine.supply, count: (supplyLeft(medicine) ?? 0) + added, countedAt: now.toISOString() } };
}

export function isCurrent(medicine: Medicine, today: string): boolean {
  return !(medicine.stopped && medicine.stopped <= today) && !(medicine.end && medicine.end < today);
}

/** What was marked on each of the last days, newest first: plain facts for the record. */
export function record(medicine: Medicine, today: string, days = 14): { date: string; taken: string[]; skipped: number }[] {
  const out: { date: string; taken: string[]; skipped: number }[] = [];
  for (let back = 0; back < days; back += 1) {
    const date = addDays(today, -back);
    const marks = medicine.taken.filter((each) => toLocalDate(new Date(each.at)) === date);
    if (!marks.length) continue;
    out.push({
      date,
      taken: marks.filter((each) => !each.skipped).map((each) => new Date(each.at)).sort((a, b) => a.getTime() - b.getTime()).map((at) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })),
      skipped: marks.filter((each) => each.skipped).length,
    });
  }
  return out;
}

export function daysText(days: DoseDays): string {
  switch (days.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return days.days.length === 7 ? 'Every day' : [...days.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => WEEKDAYS[day]).join(', ');
    case 'every':
      return days.every === 1 ? 'Every day' : `Every ${days.every} days`;
  }
}

/** Appointments from today on, soonest first; and those before, newest first. */
export function splitAppointments(all: readonly Appointment[], now: Date): { coming: Appointment[]; past: Appointment[] } {
  const stamp = (appointment: Appointment) => new Date(appointment.at).getTime();
  const startOfToday = parseLocalDate(toLocalDate(now)).getTime();
  return {
    coming: all.filter((each) => stamp(each) >= startOfToday).sort((a, b) => stamp(a) - stamp(b)),
    past: all.filter((each) => stamp(each) < startOfToday).sort((a, b) => stamp(b) - stamp(a)),
  };
}

export type HealthCard = { allergies?: string; conditions?: string; contact?: string };

/** The medicines being taken, as plain text to share with a doctor or pharmacist. */
export function listText(medicines: readonly Medicine[], today: string, card: HealthCard = {}, readings: readonly string[] = []): string {
  const lines = medicines
    .filter((medicine) => isCurrent(medicine, today))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((medicine) => {
      const when = [medicine.times.length ? `${medicine.times.map(timeText).join(', ')}, ${daysText(medicine.days).toLowerCase()}` : undefined, medicine.asNeeded ? 'as needed' : undefined].filter(Boolean).join('; ');
      return `- ${[medicine.name, medicine.dose].filter(Boolean).join(' ')}${medicine.how ? ` (${medicine.how})` : ''}${when ? `: ${when}` : ''}`;
    });
  const extra = [card.allergies ? `Allergies: ${card.allergies}` : undefined, card.conditions ? `Conditions: ${card.conditions}` : undefined, card.contact ? `Contact: ${card.contact}` : undefined].filter(Boolean);
  return [`Medicines, ${parseLocalDate(today).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`, ...lines, ...(extra.length ? ['', ...extra] : []), ...(readings.length ? ['', 'Latest readings', ...readings.map((line) => `- ${line}`)] : [])].join('\n');
}
