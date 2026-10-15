import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { nextDue, warrantiesEnding, monthText, type Thing, type Upkeep } from './things';

export type UpkeepNoticeChoices = { on: boolean; at: string; warranties: boolean };

export const defaultUpkeepNotices: UpkeepNoticeChoices = { on: true, at: '09:00', warranties: true };

/** One notice on each day upkeep comes around, naming it; and a month before a warranty ends. A day already come is not said again. */
export function upkeepNotices(upkeeps: readonly Upkeep[], things: readonly Thing[], choices: UpkeepNoticeChoices, today: string, horizon: number, now: Date): Notice[] {
  const notices: Notice[] = [];
  if (choices.on) {
    const byDay = new Map<string, string[]>();
    for (const upkeep of upkeeps) {
      const due = nextDue(upkeep, things.find((thing) => thing.id === upkeep.thingId));
      if (due.date < today || due.date > addDays(today, horizon)) continue;
      byDay.set(due.date, [...(byDay.get(due.date) ?? []), upkeep.name]);
    }
    for (const [day, names] of byDay) {
      const at = atTime(day, choices.at);
      if (at < now) continue;
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      notices.push({ key: `ktema:${day}:${sorted.join('|').slice(0, 80)}`, kind: 'upkeep', at, title: sorted.length === 1 ? sorted[0] : `${sorted.length} things to look after`, body: sorted.length === 1 ? 'Today.' : sorted.join(', '), open: 'ktema:today' });
    }
  }
  if (choices.warranties) {
    for (const thing of warrantiesEnding(things, today, 30 + horizon)) {
      const day = addDays(thing.warrantyUntil!, -30);
      if (day < today || day > addDays(today, horizon)) continue;
      const at = atTime(day, choices.at);
      if (at < now) continue;
      notices.push({ key: `ktema:warranty:${thing.id}:${thing.warrantyUntil}`, kind: 'upkeep', at, title: thing.name, body: thing.category === 'Documents' ? `Until ${monthText(thing.warrantyUntil!)}.` : `Warranty until ${monthText(thing.warrantyUntil!)}.`, open: `ktema:thing:${thing.id}` });
    }
  }
  return notices;
}
