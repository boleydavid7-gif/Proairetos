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

function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const distance = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distance);
  return start;
}

function minutesFrom(event: ItemEvent): number {
  const value = Number(event.metadata?.minutes ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function plannedMinutesFrom(event: ItemEvent): number {
  const planned = Number(event.metadata?.plannedMinutes ?? 0);
  return Number.isFinite(planned) && planned > 0 ? planned : minutesFrom(event);
}

export function praxisFocusEvents(events: readonly ItemEvent[]): ItemEvent[] {
  return events.filter((event) => event.kind === 'FOCUSED' && event.metadata?.app === 'praxis');
}

export type PraxisStats = {
  thisWeekMinutes: number;
  sessionCount: number;
  averageCompletion: number;
};

export function summarizeFocus(events: readonly ItemEvent[], now = new Date()): PraxisStats {
  const focus = praxisFocusEvents(events);
  const start = weekStart(now).getTime();
  const thisWeekMinutes = focus
    .filter((event) => new Date(event.timestamp).getTime() >= start)
    .reduce((total, event) => total + minutesFrom(event), 0);
  const averageCompletion = focus.length
    ? Math.round(
        (focus.reduce((total, event) => total + Math.min(1, minutesFrom(event) / plannedMinutesFrom(event)), 0) / focus.length) * 100,
      )
    : 0;
  return { thisWeekMinutes, sessionCount: focus.length, averageCompletion };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatSessionDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export function dayMinutes(events: readonly ItemEvent[], date: Date): number {
  const key = localDateKey(date);
  return praxisFocusEvents(events)
    .filter((event) => localDateKey(new Date(event.timestamp)) === key)
    .reduce((total, event) => total + minutesFrom(event), 0);
}

export function focusMinutes(event: ItemEvent): number {
  return minutesFrom(event);
}

export function plannedMinutes(event: ItemEvent): number {
  return plannedMinutesFrom(event);
}
