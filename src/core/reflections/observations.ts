import type { Decision } from '../decisions/types';
import type { ItemEvent } from '../item-events/types';
import type { LifeItem } from '../life-items/types';
import type { ScheduleOccurrence } from '../scheduling/types';
import type { ChosenValue } from '../values/types';
import { isWithin, type PeriodRange } from './periods';

export type ObservationKind = 'CAPTURED' | 'CLOSED' | 'FOCUS' | 'VALUES' | 'MOVED' | 'WAITING' | 'DECISIONS' | 'TIME';

/**
 * A plain fact about a period. Observations count and list; they never
 * judge, compare to a goal, guess a mood, or suggest what to do.
 */
export interface Observation {
  kind: ObservationKind;
  text: string;
  detail?: string;
}

export type ObservationInput = {
  range: PeriodRange;
  now: Date;
  items: LifeItem[];
  events: ItemEvent[];
  decisions: Decision[];
  values: ChosenValue[];
  occurrences: ScheduleOccurrence[];
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

const listNames = (names: string[], limit = 3) =>
  names.length > limit ? `${names.slice(0, limit).join(', ')}, and ${names.length - limit} more` : names.join(', ');

/** Facts in a fixed order. Nothing is ranked by importance. */
export function observePeriod({ range, now, items, events, decisions, values, occurrences }: ObservationInput): Observation[] {
  const inRange = events.filter((event) => isWithin(event.timestamp, range));
  const count = (kind: ItemEvent['kind']) => inRange.filter((event) => event.kind === kind).length;
  const titleOf = new Map(items.map((item) => [item.id, item.title]));
  const results: Observation[] = [];

  const captured = count('CREATED');
  if (captured > 0) results.push({ kind: 'CAPTURED', text: `${plural(captured, 'thing')} captured` });

  const done = count('COMPLETED');
  const letGo = count('LET_GO');
  if (done + letGo > 0) {
    const parts = [done && `${done} done`, letGo && `${letGo} let go`].filter(Boolean);
    results.push({ kind: 'CLOSED', text: parts.join(' · ') });
  }

  const focus = inRange.filter((event) => event.kind === 'FOCUSED');
  const focusMinutes = focus.reduce((total, event) => total + Number(event.metadata?.minutes ?? 0), 0);
  if (focusMinutes > 0) {
    const focusedItems = new Set(focus.map((event) => event.itemId)).size;
    results.push({ kind: 'FOCUS', text: `Focused ${formatMinutes(focusMinutes)} across ${plural(focusedItems, 'item')}` });
  }

  const doneInRange = new Set(inRange.filter((event) => event.kind === 'COMPLETED').map((event) => event.itemId));
  const valueLines = values
    .map((value) => {
      const connected = items.filter((item) => item.valueIds?.includes(value.id));
      const finished = connected.filter((item) => doneInRange.has(item.id)).length;
      if (connected.length === 0) return null;
      return `${value.name}: ${plural(connected.length, 'item')} connected${finished ? `, ${finished} done` : ''}`;
    })
    .filter((line): line is string => line !== null);
  if (valueLines.length > 0) {
    results.push({ kind: 'VALUES', text: 'Connected to your values', detail: valueLines.join('\n') });
  }

  const moves = new Map<string, number>();
  for (const event of inRange) {
    if (event.kind === 'RESCHEDULED') moves.set(event.itemId, (moves.get(event.itemId) ?? 0) + 1);
  }
  const movedOften = [...moves.entries()]
    .filter(([, times]) => times >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([itemId, times]) => `${titleOf.get(itemId) ?? 'An item'} (${times} times)`);
  if (movedOften.length > 0) {
    results.push({ kind: 'MOVED', text: 'Moved more than once', detail: listNames(movedOften) });
  }

  const waitingSince = items
    .filter((item) => item.status === 'WAITING')
    .map((item) => {
      const started = events
        .filter((event) => event.itemId === item.id && event.kind === 'WAITING_STARTED')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return started ? { item, since: new Date(started.timestamp) } : null;
    })
    .filter((entry): entry is { item: LifeItem; since: Date } => entry !== null)
    .filter((entry) => now.getTime() - entry.since.getTime() >= 7 * 86_400_000)
    .sort((a, b) => a.since.getTime() - b.since.getTime());
  if (waitingSince.length > 0) {
    const longest = waitingSince[0];
    const since = longest.since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    results.push({
      kind: 'WAITING',
      text: `Waiting since ${since}`,
      detail: waitingSince.length > 1 ? `${longest.item.title}, and ${waitingSince.length - 1} more` : longest.item.title,
    });
  }

  const decided = decisions.filter((decision) => isWithin(decision.decidedAt, range));
  if (decided.length > 0) {
    results.push({
      kind: 'DECISIONS',
      text: `${plural(decided.length, 'decision')} made`,
      detail: listNames(decided.map((decision) => `${decision.question}: ${decision.choice}`), 2),
    });
  }

  const minutesOf = (kind: ScheduleOccurrence['kind']) =>
    occurrences
      .filter((o) => o.kind === kind)
      .reduce((total, o) => {
        const start = Math.max(o.start.getTime(), range.start.getTime());
        const end = Math.min(o.end.getTime(), range.end.getTime());
        return total + Math.max(0, end - start) / 60_000;
      }, 0);
  const committed = Math.round(minutesOf('COMMITTED'));
  const protectedTime = Math.round(minutesOf('PROTECTED'));
  if (committed + protectedTime > 0) {
    const parts = [
      committed && `Work and commitments: ${formatMinutes(committed)}`,
      protectedTime && `Protected time: ${formatMinutes(protectedTime)}`,
    ].filter(Boolean);
    results.push({ kind: 'TIME', text: 'Time on your schedule', detail: parts.join('\n') });
  }

  return results;
}
