import { useServiceData } from '../hooks/useServiceData';
import { lifeService } from '../services';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import { focusMinutes, praxisFocusEvents } from '../../praxis/data';

export type StudySession = { id: string; itemId: string; title: string; minutes: number; at: string };
export type Study = { blocks: LifeItem[]; sessions: StudySession[] };

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
  }));
}

/** Sessions that ended within a span of time. */
export const studyBetween = (sessions: readonly StudySession[], start: Date, end: Date) =>
  sessions.filter((session) => {
    const at = new Date(session.at).getTime();
    return at >= start.getTime() && at < end.getTime();
  });

/** Blocks the person set to look at again on or before `day`, still open. */
export const lookAgainBy = (blocks: readonly LifeItem[], day: string) =>
  blocks.filter((block) => block.status !== 'DONE' && block.plannedFor && block.plannedFor <= day);
