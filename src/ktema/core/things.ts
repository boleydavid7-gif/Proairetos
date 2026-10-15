import { addDays, daysBetween, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';

/*
 * Ktema keeps what the person owns and looks after: the details that are hard to find when needed (model, serial,
 * receipt, warranty, manual) and the upkeep that comes round by date or, for a car, by distance. Like Ergon, a
 * day that has come stays the upkeep's day until it is done or skipped; it is never called late.
 */

export const CATEGORIES = ['Home', 'Appliance', 'Car', 'Tech', 'Furniture', 'Tools', 'Garden', 'Documents', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];
export type DistanceUnit = 'mi' | 'km';

export type Reading = { date: string; value: number };

export type Thing = {
  id: string;
  name: string;
  category: Category;
  /** Room or place: "Kitchen", "Garage". */
  place?: string;
  make?: string;
  model?: string;
  serial?: string;
  boughtOn?: string;
  /** As the person writes it: "$649", "£120". */
  price?: string;
  store?: string;
  warrantyUntil?: string;
  /** A link to the manual or receipt. */
  link?: string;
  note?: string;
  /** Odometer readings, for a car or anything measured by distance. */
  readings?: Reading[];
  createdAt: string;
};

export type Every = { count: number; unit: 'days' | 'weeks' | 'months' | 'years' };

export type UpkeepDone = { date: string; reading?: number; cost?: string; note?: string; skipped?: boolean };

export type Upkeep = {
  id: string;
  name: string;
  thingId?: string;
  every: Every;
  /** Also due by distance (a car): every this many miles or kilometres, whichever comes first. */
  distance?: number;
  /** First day, for one never done. */
  start: string;
  history: UpkeepDone[];
  note?: string;
  createdAt: string;
};

export const IDEAS: { name: string; category: Category; every: Every; distance?: { mi: number; km: number } }[] = [
  { name: 'Test the smoke alarms', category: 'Home', every: { count: 1, unit: 'months' } },
  { name: 'Smoke alarm batteries', category: 'Home', every: { count: 1, unit: 'years' } },
  { name: 'Air filter', category: 'Home', every: { count: 3, unit: 'months' } },
  { name: 'Clear the gutters', category: 'Home', every: { count: 6, unit: 'months' } },
  { name: 'Clean the dryer vent', category: 'Appliance', every: { count: 1, unit: 'years' } },
  { name: 'Clean the fridge coils', category: 'Appliance', every: { count: 1, unit: 'years' } },
  { name: 'Flush the water heater', category: 'Appliance', every: { count: 1, unit: 'years' } },
  { name: 'Oil change', category: 'Car', every: { count: 6, unit: 'months' }, distance: { mi: 5000, km: 8000 } },
  { name: 'Tire pressure', category: 'Car', every: { count: 1, unit: 'months' } },
  { name: 'Back up the computer', category: 'Tech', every: { count: 1, unit: 'months' } },
];

export const IDEAS_NOTE = 'Common times; the manual has the ones for yours.';

/** Adds whole months, keeping to the end of a shorter month (Jan 31 + 1 month = Feb 28). */
export function addMonths(date: string, months: number): string {
  const start = parseLocalDate(date);
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toLocalDate(new Date(target.getFullYear(), target.getMonth(), Math.min(start.getDate(), last)));
}

export function after(date: string, every: Every): string {
  const count = Math.max(1, every.count);
  switch (every.unit) {
    case 'days':
      return addDays(date, count);
    case 'weeks':
      return addDays(date, count * 7);
    case 'months':
      return addMonths(date, count);
    case 'years':
      return addMonths(date, count * 12);
  }
}

export function lastDone(upkeep: Upkeep): UpkeepDone | undefined {
  return [...upkeep.history].sort((a, b) => a.date.localeCompare(b.date)).pop();
}

export function latestReading(thing?: Thing): Reading | undefined {
  return [...(thing?.readings ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.value - b.value).pop();
}

/** About how far a day, from the first and latest readings (needs two, a week or more apart). */
export function perDay(thing?: Thing): number | undefined {
  const readings = [...(thing?.readings ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (readings.length < 2) return undefined;
  const first = readings[0];
  const last = readings[readings.length - 1];
  const days = daysBetween(first.date, last.date);
  return days >= 7 && last.value > first.value ? (last.value - first.value) / days : undefined;
}

export type Due = { date: string; reading?: number; byDistance?: boolean };

/**
 * When the upkeep is next due: by date from when it was last done (or its start), and by distance from the reading
 * it was last done at. With both, the earlier wins; a distance due day is estimated from the readings so far.
 */
export function nextDue(upkeep: Upkeep, thing?: Thing): Due {
  const last = lastDone(upkeep);
  const byDate = last ? after(last.date, upkeep.every) : upkeep.start;
  if (!upkeep.distance) return { date: byDate };
  const from = last?.reading ?? latestReading(thing)?.value;
  if (from === undefined) return { date: byDate };
  const reading = from + upkeep.distance;
  const now = latestReading(thing);
  if (now && now.value >= reading) return { date: now.date < byDate ? now.date : byDate, reading, byDistance: now.date < byDate };
  const rate = perDay(thing);
  if (now && rate) {
    const estimate = addDays(now.date, Math.ceil((reading - now.value) / rate));
    if (estimate < byDate) return { date: estimate, reading, byDistance: true };
  }
  return { date: byDate, reading };
}

export function markDone(upkeep: Upkeep, date: string, extra: Omit<UpkeepDone, 'date'> = {}): Upkeep {
  return { ...upkeep, history: [...upkeep.history, { date, ...extra }] };
}

export function skip(upkeep: Upkeep, date: string): Upkeep {
  return { ...upkeep, history: [...upkeep.history, { date, skipped: true }] };
}

export type Grouped = { now: { upkeep: Upkeep; due: Due }[]; soon: { upkeep: Upkeep; due: Due }[]; later: { upkeep: Upkeep; due: Due }[] };

/** Upkeep whose day has come; then the next 30 days; then later. */
export function grouped(upkeeps: readonly Upkeep[], things: readonly Thing[], today: string): Grouped {
  const out: Grouped = { now: [], soon: [], later: [] };
  const withDue = upkeeps
    .map((upkeep) => ({ upkeep, due: nextDue(upkeep, things.find((thing) => thing.id === upkeep.thingId)) }))
    .sort((a, b) => a.due.date.localeCompare(b.due.date) || a.upkeep.name.localeCompare(b.upkeep.name));
  for (const each of withDue) {
    if (each.due.date <= today) out.now.push(each);
    else if (each.due.date <= addDays(today, 30)) out.soon.push(each);
    else out.later.push(each);
  }
  return out;
}

const short = (date: string) => parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "Today", "Since Tue", "Since Mar 3", "Tomorrow", "Fri", "Mar 3". */
export function dayText(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return days >= -6 ? `Since ${parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short' })}` : `Since ${short(date)}`;
  if (days < 7) return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short' });
  return short(date);
}

export function everyText(every: Every): string {
  const unit = every.count === 1 ? every.unit.slice(0, -1) : every.unit;
  return every.count === 1 ? `Every ${unit}` : `Every ${every.count} ${unit}`;
}

export function monthText(date: string): string {
  return parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** A warranty in words: "Until Jun 2027", or "Ended Mar 2025". */
export function warrantyText(thing: Thing, today: string): string | undefined {
  if (!thing.warrantyUntil) return undefined;
  // A passport, a licence or a policy: it runs until a date rather than having a warranty.
  if (thing.category === 'Documents') return thing.warrantyUntil >= today ? `Until ${monthText(thing.warrantyUntil)}` : `Ended ${monthText(thing.warrantyUntil)}`;
  return thing.warrantyUntil >= today ? `Warranty until ${monthText(thing.warrantyUntil)}` : `Warranty ended ${monthText(thing.warrantyUntil)}`;
}

/** Warranties that end within `within` days, soonest first. */
export function warrantiesEnding(things: readonly Thing[], today: string, within = 60): Thing[] {
  return things.filter((thing) => thing.warrantyUntil && thing.warrantyUntil >= today && thing.warrantyUntil <= addDays(today, within)).sort((a, b) => a.warrantyUntil!.localeCompare(b.warrantyUntil!));
}

export function warrantyFrom(boughtOn: string, years: number): string {
  return addMonths(boughtOn, years * 12);
}

/** Things that match every word typed, in name, make, model, serial, place, store or note. */
export function search(things: readonly Thing[], text: string): Thing[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...things];
  return things.filter((thing) => {
    const hay = [thing.name, thing.make, thing.model, thing.serial, thing.place, thing.store, thing.note, thing.category].filter(Boolean).join(' ').toLowerCase();
    return words.every((word) => hay.includes(word));
  });
}
