import type { ItemEvent } from '../core/item-events/types';

export type PraxisQuote = {
  text: string;
  source: string;
};

/** A small, stable set of study-oriented lines; the date chooses one for the day. */
export const praxisQuotes: readonly PraxisQuote[] = [
  { text: 'First say to yourself what you would be; and then do what you have to do.', source: 'Epictetus, Discourses 3.23' },
  { text: 'It is impossible for a person to learn what they think they already know.', source: 'Epictetus, attributed' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', source: 'Marcus Aurelius, Meditations 5.20' },
  { text: 'The mind is difficult to control and swift; training it is good.', source: 'The Dhammapada, 35' },
  { text: 'You yourself must strive. The Buddhas only point the way.', source: 'The Dhammapada, 165' },
  { text: 'No mud, no lotus.', source: 'Thich Nhat Hanh' },
  { text: 'While we are postponing, life speeds by.', source: 'Seneca, Letters 1' },
  { text: 'Look within. Within is the fountain of good, if you will ever dig.', source: 'Marcus Aurelius, Meditations 7.59' },
  { text: 'All that we are is the result of what we have thought.', source: 'The Dhammapada, 1' },
];

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function quoteFor(date: Date): PraxisQuote {
  const key = localDateKey(date);
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return praxisQuotes[(hash >>> 0) % praxisQuotes.length];
}

/** The seven days (Monday first) of the week holding `day`, as date keys. */
export function weekOf(day: string): string[] {
  const [year, month, date] = day.split('-').map(Number);
  const start = new Date(year, month - 1, date, 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const each = new Date(start);
    each.setDate(start.getDate() + index);
    return localDateKey(each);
  });
}

export function focusMinutes(event: ItemEvent): number {
  const value = Number(event.metadata?.minutes ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function praxisFocusEvents(events: readonly ItemEvent[]): ItemEvent[] {
  return events.filter((event) => event.kind === 'FOCUSED' && event.metadata?.app === 'praxis');
}

/** A session's day: when it ended, as the person's day (a night shift keeps its study). */
export type DayAt = (when: Date) => string;
const calendarDay: DayAt = (when) => localDateKey(when);

export function sessionDay(event: ItemEvent, dayAt: DayAt = calendarDay): string {
  return dayAt(new Date(event.timestamp));
}

/** Minutes studied on each of the given days. Facts only. */
export function minutesByDay(events: readonly ItemEvent[], days: readonly string[], dayAt: DayAt = calendarDay): number[] {
  const totals = new Map<string, number>();
  for (const event of praxisFocusEvents(events)) {
    const day = sessionDay(event, dayAt);
    totals.set(day, (totals.get(day) ?? 0) + focusMinutes(event));
  }
  return days.map((day) => totals.get(day) ?? 0);
}

/** Minutes by block over the given days, most first. */
export function minutesByBlock(events: readonly ItemEvent[], days: readonly string[], dayAt: DayAt = calendarDay): { itemId: string; minutes: number }[] {
  const within = new Set(days);
  const totals = new Map<string, number>();
  for (const event of praxisFocusEvents(events)) {
    if (!within.has(sessionDay(event, dayAt))) continue;
    totals.set(event.itemId, (totals.get(event.itemId) ?? 0) + focusMinutes(event));
  }
  return [...totals].map(([itemId, minutes]) => ({ itemId, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatSessionTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(year, month - 1, date, 12));
}

/** Lengths offered for a block; any whole number from 1 to 240 can be typed too. */
export const LENGTHS = [15, 25, 45, 60, 90] as const;
export const clampMinutes = (value: number) => Math.max(1, Math.min(240, Math.round(value)));

/** Coming back to something after a gap, offered after a block. */
export const LOOK_AGAIN = [
  { days: 1, label: 'Tomorrow' },
  { days: 3, label: 'In 3 days' },
  { days: 7, label: 'In a week' },
] as const;

export const LOOK_AGAIN_SOURCE =
  'Spacing: Cepeda et al., Distributed practice in verbal recall tasks (Psychological Bulletin, 2006). Recalling: Roediger & Karpicke, Test-enhanced learning (Psychological Science, 2006).';

export function addDaysKey(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, date + days, 12));
}

/** The three blocks an earlier Praxis made on its own, so they can be taken back out once. */
export const STARTER_TITLES: readonly string[] = ['Deep Work', 'Read and take notes', 'Review one idea'];

/** Starter blocks never used: made by the app, still open, with no time recorded on them. */
export function unusedStarters<T extends { id: string; title: string; status: string; app?: string }>(items: readonly T[], events: readonly ItemEvent[]): T[] {
  const used = new Set(praxisFocusEvents(events).map((event) => event.itemId));
  return items.filter((item) => item.app === 'praxis' && item.status === 'OPEN' && STARTER_TITLES.includes(item.title) && !used.has(item.id));
}
