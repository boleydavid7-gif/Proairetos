import { addDays, daysBetween, parseLocalDate } from '../../core/scheduling/dates';
import { speciesBy, type Dryness } from './species';

/*
 * Phyton keeps the plants in a home and when to look at them. A plant comes around to be checked, not
 * watered on a fixed day: the person touches the soil and marks Watered or Still moist. The days between
 * waterings start from the plant's type and then follow what was actually done; they stretch in the cool
 * months, and rain counts for plants outside. A day that has come reads "Since Tue", never late.
 */

export type LogKind = 'water' | 'moist' | 'feed' | 'repot' | 'prune' | 'pest' | 'note';
/** One mark in a plant's record; pests and notes may carry a few words. */
export type LogEntry = { date: string; kind: LogKind; by?: string; text?: string };

export type Plant = {
  id: string;
  /** The person's name for it ("Kitchen pothos"). */
  name: string;
  /** A type from the table, if it is one. */
  species?: string;
  /** The Latin name, from an identification or typed. */
  latin?: string;
  place?: string;
  /** Outside, where rain reaches it. */
  outside?: boolean;
  /** Days between waterings in spring and summer, as chosen or from the type. */
  every: number;
  /** Weeks between feeds in spring and summer; none when absent. */
  feedEvery?: number;
  /** First day to check, for one never watered here. */
  start?: string;
  /** "Still moist": not before this day. */
  checkFrom?: string;
  /** The last 40 marks (a shared home's records are small). */
  log: LogEntry[];
  /** Waterings, feeds and repots by year, kept whole for Your year: [water, feed, repot]. */
  tally?: Record<string, [number, number, number]>;
  note?: string;
  /** Who looks after it, in a shared home. */
  who?: string;
  createdAt: string;
};

export type Hemisphere = 'north' | 'south';

export const PLACES = ['Living room', 'Kitchen', 'Bedroom', 'Bathroom', 'Office', 'Hallway', 'Balcony', 'Garden'];

/**
 * How much longer the days between waterings run this month: plants grow slowly in winter's short days and
 * use less water (RHS). Winter half as long again, the months either side a quarter.
 */
export function seasonFactor(date: string, hemisphere: Hemisphere = 'north'): number {
  const month = Number(date.slice(5, 7));
  const m = hemisphere === 'south' ? ((month + 5) % 12) + 1 : month;
  if (m === 12 || m === 1 || m === 2) return 1.5;
  if (m === 11 || m === 3) return 1.25;
  return 1;
}

/** Months plants are fed in: spring and summer. */
export function growing(date: string, hemisphere: Hemisphere = 'north'): boolean {
  const month = Number(date.slice(5, 7));
  const m = hemisphere === 'south' ? ((month + 5) % 12) + 1 : month;
  return m >= 3 && m <= 9;
}

/** Rain on these days (mm), for plants outside. Enough to count as a watering: 5 mm. */
export type Rain = Record<string, number>;
export const RAIN_COUNTS_MM = 5;

const waterings = (plant: Plant) => plant.log.filter((entry) => entry.kind === 'water').map((entry) => entry.date).sort();

export function lastWatered(plant: Plant, rain: Rain = {}): string | undefined {
  const own = waterings(plant).pop();
  if (!plant.outside) return own;
  const rained = Object.keys(rain).filter((day) => rain[day] >= RAIN_COUNTS_MM).sort().pop();
  return [own, rained].filter((day): day is string => Boolean(day)).sort().pop();
}

/** Whether the last watering was rain. */
export function rainedLast(plant: Plant, rain: Rain = {}): boolean {
  const last = lastWatered(plant, rain);
  return Boolean(last && plant.outside && rain[last] >= RAIN_COUNTS_MM && waterings(plant).pop() !== last);
}

/**
 * Days between waterings in spring and summer as the plant's own record shows them: the middle of the last
 * five gaps, each taken back to summer length, once there are two. Otherwise the days chosen.
 */
export function learnedEvery(plant: Plant, hemisphere: Hemisphere = 'north'): number {
  const days = waterings(plant);
  const gaps: number[] = [];
  for (let i = 1; i < days.length; i += 1) {
    const gap = daysBetween(days[i - 1], days[i]);
    // Two marks a day apart or less are one watering; a gap of months is time away, not the plant.
    if (gap < 1 || gap > Math.max(60, plant.every * 4)) continue;
    gaps.push(gap / seasonFactor(days[i], hemisphere));
  }
  const recent = gaps.slice(-5).sort((a, b) => a - b);
  if (recent.length < 2) return plant.every;
  const middle = recent.length % 2 ? recent[(recent.length - 1) / 2] : (recent[recent.length / 2 - 1] + recent[recent.length / 2]) / 2;
  return Math.max(1, Math.round(middle));
}

/** Days between waterings this month. */
export function everyNow(plant: Plant, today: string, hemisphere: Hemisphere = 'north'): number {
  return Math.max(1, Math.round(learnedEvery(plant, hemisphere) * seasonFactor(today, hemisphere)));
}

/**
 * The day to look at the plant: after the last watering by the days for this month, or a Still moist. A hot day
 * before then brings a plant outside round a day sooner (never before today).
 */
export function nextCheck(plant: Plant, today: string, hemisphere: Hemisphere = 'north', rain: Rain = {}, hot: readonly string[] = []): string {
  const last = lastWatered(plant, rain);
  let due = last ? addDays(last, everyNow(plant, today, hemisphere)) : plant.start ?? plant.createdAt.slice(0, 10);
  if (plant.checkFrom && plant.checkFrom > due) due = plant.checkFrom;
  if (plant.outside && due > today && hot.some((day) => day >= today && day < due)) due = addDays(due, -1);
  return due;
}

/** The next feed, in growing months only; undefined when not fed or out of season. */
export function nextFeed(plant: Plant, today: string, hemisphere: Hemisphere = 'north'): string | undefined {
  if (!plant.feedEvery) return undefined;
  const fed = plant.log.filter((entry) => entry.kind === 'feed').map((entry) => entry.date).sort().pop();
  let day = fed ? addDays(fed, plant.feedEvery * 7) : plant.start ?? plant.createdAt.slice(0, 10);
  // Out of season, the next feed waits for spring.
  for (let step = 0; step < 12 && !growing(day, hemisphere); step += 1) day = addDays(day.slice(0, 8) + '01', 32).slice(0, 8) + '01';
  if (!fed && day < today && growing(today, hemisphere)) return today;
  return day;
}

/** How many days "Still moist" waits: the soil of thirsty plants dries sooner. */
export function moistWait(dry: Dryness | undefined): number {
  return dry === 'moist' || dry === 'top' ? 2 : 3;
}

const keep = (log: LogEntry[]) => log.slice(-40);

function counted(plant: Plant, date: string, kind: 'water' | 'feed' | 'repot'): Plant['tally'] {
  const year = date.slice(0, 4);
  const [water, fed, repotted] = plant.tally?.[year] ?? [0, 0, 0];
  return { ...plant.tally, [year]: [water + (kind === 'water' ? 1 : 0), fed + (kind === 'feed' ? 1 : 0), repotted + (kind === 'repot' ? 1 : 0)] };
}

export function water(plant: Plant, today: string, by?: string): Plant {
  return { ...plant, log: keep([...plant.log, { date: today, kind: 'water', by }]), tally: counted(plant, today, 'water'), checkFrom: undefined };
}

/** Still moist: look again in a few days. Recorded, so the days between waterings follow it. */
export function stillMoist(plant: Plant, today: string, by?: string): Plant {
  const wait = moistWait(speciesBy(plant.species)?.dry);
  return { ...plant, log: keep([...plant.log, { date: today, kind: 'moist', by }]), checkFrom: addDays(today, wait) };
}

export function feed(plant: Plant, today: string, by?: string): Plant {
  return { ...plant, log: keep([...plant.log, { date: today, kind: 'feed', by }]), tally: counted(plant, today, 'feed') };
}

export function repot(plant: Plant, today: string, by?: string): Plant {
  return { ...plant, log: keep([...plant.log, { date: today, kind: 'repot', by }]), tally: counted(plant, today, 'repot') };
}

export type Grouped = { now: Plant[]; week: Plant[]; later: Plant[] };

/** Plants to look at now (the day has come), then in the next seven days, then later. */
export function grouped(plants: readonly Plant[], today: string, hemisphere: Hemisphere = 'north', rain: Rain = {}, hot: readonly string[] = []): Grouped {
  const withDay = plants.map((plant) => ({ plant, day: nextCheck(plant, today, hemisphere, rain, hot) }));
  withDay.sort((a, b) => a.day.localeCompare(b.day) || a.plant.name.localeCompare(b.plant.name));
  const week = addDays(today, 7);
  return {
    now: withDay.filter((each) => each.day <= today).map((each) => each.plant),
    week: withDay.filter((each) => each.day > today && each.day <= week).map((each) => each.plant),
    later: withDay.filter((each) => each.day > week).map((each) => each.plant),
  };
}

/** Plants whose feed day has come, in growing months. */
export function toFeed(plants: readonly Plant[], today: string, hemisphere: Hemisphere = 'north'): Plant[] {
  return plants.filter((plant) => {
    const day = nextFeed(plant, today, hemisphere);
    return Boolean(day && day <= today && growing(today, hemisphere));
  });
}

/** "Today", "Tomorrow", "Fri", "12 Oct"; a day that has come says since when. */
export function dayText(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'Today';
  if (days < 0) return days === -1 ? 'Since yesterday' : `Since ${parseLocalDate(date).toLocaleDateString(undefined, days > -7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' })}`;
  if (days === 1) return 'Tomorrow';
  if (days < 7) return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short' });
  return parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "Watered 3 days ago", "Watered today", "Rain 2 days ago"; plain facts. */
export function wateredText(plant: Plant, today: string, rain: Rain = {}): string {
  const last = lastWatered(plant, rain);
  if (!last) return 'Not watered here yet';
  const what = rainedLast(plant, rain) ? 'Rain' : 'Watered';
  const days = daysBetween(last, today);
  return days === 0 ? `${what} today` : days === 1 ? `${what} yesterday` : `${what} ${days} days ago`;
}

export function everyText(days: number): string {
  if (days === 1) return 'Every day';
  if (days % 7 === 0 && days >= 14) return `Every ${days / 7} weeks`;
  if (days === 7) return 'Every week';
  return `Every ${days} days`;
}

export const LOG_TEXT: Record<LogKind, string> = { water: 'Watered', moist: 'Still moist', feed: 'Fed', repot: 'Repotted', prune: 'Pruned', pest: 'Pests seen', note: 'Note' };

/** A line in the plant's care journal: pruned, pests seen (what, optional), or a note. */
export function journal(plant: Plant, today: string, kind: 'prune' | 'pest' | 'note', text?: string, by?: string): Plant {
  const words = text?.trim().slice(0, 140) || undefined;
  return { ...plant, log: keep([...plant.log, { date: today, kind, by, text: words }]) };
}

/**
 * A shared home's record is sealed into at most 4,000 characters, so the oldest marks give way first (never fewer
 * than ten), keeping the plant itself whole.
 */
export function fitForSharing(plant: Plant, most = 2700): Plant {
  let fitted = plant;
  while (JSON.stringify(fitted).length > most && fitted.log.length > 10) fitted = { ...fitted, log: fitted.log.slice(1) };
  return fitted;
}

/** Names used in the home, for choosing who. */
export function namesIn(plants: readonly Plant[], extra: readonly string[] = []): string[] {
  const names = new Set<string>(extra.filter(Boolean));
  for (const plant of plants) {
    if (plant.who) names.add(plant.who);
    for (const entry of plant.log) if (entry.by) names.add(entry.by);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
