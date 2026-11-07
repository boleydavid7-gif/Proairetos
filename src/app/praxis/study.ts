import { useServiceData } from '../hooks/useServiceData';
import { lifeService } from '../services';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import { focusMinutes, localDateKey, praxisFocusEvents } from '../../praxis/data';

export type StudySession = { id: string; itemId: string; title: string; minutes: number; at: string; kind: 'study' | 'reading' };
export type Study = { blocks: LifeItem[]; sessions: StudySession[] };

/** Theoria gives the Praxis timer a stable Read: title, so Proairetos can keep it as reading. */
export function isReadingTitle(title: string): boolean {
  return /^read:\s*/i.test(title);
}

export function isReadingSession(session: Pick<StudySession, 'kind'>): boolean {
  return session.kind === 'reading';
}

function readingKey(title: string): string {
  return title.replace(/^read:\s*/i, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** Praxis blocks and the study recorded on them, read for Proairetos (nothing written). */
export function useStudy(enabled = true): Study | undefined {
  return useServiceData(
    lifeService.subscribe,
    async () => {
      if (!enabled) return { blocks: [], sessions: [] };
      const [blocks, events] = await Promise.all([lifeService.listForApp('praxis'), lifeService.historyForAll(true)]);
      return { blocks, sessions: studySessions(blocks, events) };
    },
    [enabled],
  );
}

export function studySessions(blocks: readonly LifeItem[], events: readonly ItemEvent[]): StudySession[] {
  const titles = new Map(blocks.map((block) => [block.id, block.title]));
  return praxisFocusEvents(events).map((event) => ({
    id: event.id,
    itemId: event.itemId,
    title: titles.get(event.itemId) ?? 'Study',
    minutes: focusMinutes(event),
    at: event.timestamp,
    kind: isReadingTitle(titles.get(event.itemId) ?? '') ? 'reading' : 'study',
  }));
}

/** Sessions that ended within a span of time. */
export const studyBetween = (sessions: readonly StudySession[], start: Date, end: Date) =>
  sessions.filter((session) => {
    const at = new Date(session.at).getTime();
    return at >= start.getTime() && at < end.getTime();
  });

/**
 * The timer can be used in several short stretches. Keep those source sessions intact, but show one
 * reading entry per book and day in Proairetos so a reading session does not crowd out the rest of the day.
 */
export function combineReadingSessions(sessions: readonly StudySession[]): StudySession[] {
  const combined: StudySession[] = [];
  const readingAt = new Map<string, number>();
  for (const session of sessions) {
    if (!isReadingSession(session)) {
      combined.push(session);
      continue;
    }
    const key = `${localDateKey(new Date(session.at))}:${readingKey(session.title)}`;
    const existingIndex = readingAt.get(key);
    if (existingIndex === undefined) {
      readingAt.set(key, combined.length);
      combined.push({ ...session });
    } else {
      const existing = combined[existingIndex];
      combined[existingIndex] = { ...existing, minutes: existing.minutes + session.minutes };
    }
  }
  return combined;
}

/** Blocks the person set to look at again on or before `day`, still open. */
export const lookAgainBy = (blocks: readonly LifeItem[], day: string) =>
  blocks.filter((block) => block.status !== 'DONE' && block.plannedFor && block.plannedFor <= day);
