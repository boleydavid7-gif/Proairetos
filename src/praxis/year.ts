import type { ItemEvent } from '../core/item-events/types';
import { countText, durationText, facts, inYear, type Year } from '../core/year/year';
import { focusMinutes, praxisFocusEvents, sessionDay, type DayAt } from './data';

/** Study in a year: minutes, sessions, days, and each block's minutes. */
export function praxisYear(events: readonly ItemEvent[], titles: ReadonlyMap<string, string>, year: number, dayAt?: DayAt): Year {
  const kept = praxisFocusEvents(events).filter((event) => inYear(sessionDay(event, dayAt), year));
  if (!kept.length) return { facts: [], lists: [] };
  const minutes = kept.reduce((sum, event) => sum + focusMinutes(event), 0);
  const byBlock = new Map<string, number>();
  for (const event of kept) byBlock.set(event.itemId, (byBlock.get(event.itemId) ?? 0) + focusMinutes(event));
  return {
    facts: facts(['Time studied', minutes > 0 && durationText(minutes)], ['Sessions', countText(kept.length)], ['Days', countText(new Set(kept.map((event) => sessionDay(event, dayAt))).size)]),
    lists: [{ title: 'Each block', lines: [...byBlock].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${titles.get(id) ?? 'A block'}: ${durationText(n)}`) }].filter((list) => list.lines.length),
  };
}
