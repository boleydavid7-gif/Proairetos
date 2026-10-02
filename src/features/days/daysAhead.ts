import type { CalendarSource } from '../../app/calendars/otherCalendars';
import type { TagColor } from '../../core/look/tagColors';
import type { CompassStatement } from '../../core/compass/types';
import type { SchedulePattern } from '../../core/scheduling/types';
import { blockTitle, type TimelineEntry } from '../today/timeline';

/** Where Days ahead opens: the day being looked at, and the entry tapped, if any. Read once by the page. */
let opening: { start?: string; focusKey?: string } = {};

export function setDaysAheadOpening(next: { start?: string; focusKey?: string }): void {
  opening = next;
}

export function takeDaysAheadOpening(): { start?: string; focusKey?: string } {
  const current = opening;
  opening = {};
  return current;
}

export type Timed = Exclude<TimelineEntry, { kind: 'off' } | { kind: 'allday' }>;
export type EntryIcon = 'work' | 'protected' | 'item' | 'event';

export type EntryLook = { title: string; color?: TagColor; icon: EntryIcon; location?: string; detail?: string; short?: string };

/**
 * How an entry looks: the person's own colour if they gave one, else a
 * quiet default by kind. Colours are labels only; nothing reads meaning
 * into them.
 */
export type GoalContext = { goals: readonly CompassStatement[]; lines: ReadonlyMap<string, string> };

export function entryLook(
  entry: Timed,
  patterns: readonly SchedulePattern[],
  sources: readonly CalendarSource[],
  goals: GoalContext = { goals: [], lines: new Map() },
): EntryLook {
  if (entry.kind === 'shift') {
    const pattern = patterns.find((p) => p.id === entry.occurrence.patternId);
    const protectedTime = entry.occurrence.kind === 'PROTECTED';
    return {
      title: blockTitle(entry.occurrence),
      short: entry.occurrence.label ?? entry.occurrence.patternName,
      color: entry.occurrence.color ?? pattern?.color ?? (protectedTime ? 'sage' : 'amber'),
      icon: protectedTime ? 'protected' : 'work',
      location: pattern?.location,
      detail: goals.lines.get(entry.occurrence.patternId) ?? (entry.occurrence.changed ? 'Changed for this day' : undefined),
    };
  }
  if (entry.kind === 'event') {
    const source = sources.find((s) => s.id === entry.event.sourceId);
    return { title: entry.event.title, color: source?.color ?? 'sky', icon: 'event', location: entry.event.location, detail: entry.event.source };
  }
  // A step toward a goal takes the goal's colour unless it has its own.
  const goalColor = entry.item.goalId ? goals.goals.find((goal) => goal.id === entry.item.goalId)?.color : undefined;
  return { title: entry.item.title, color: entry.item.color ?? goalColor, icon: 'item', location: entry.item.location };
}
