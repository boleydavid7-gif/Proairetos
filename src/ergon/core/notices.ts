import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { nextDay, type Chore } from './chores';

export type ChoreNoticeChoices = { on: boolean; at: string; onlyMine: boolean };

export const defaultChoreNotices: ChoreNoticeChoices = { on: true, at: '09:00', onlyMine: false };

/** One notice on each day chores come round, at the chosen time, naming them. A day already come is not said again. */
export function choreNotices(chores: readonly Chore[], choices: ChoreNoticeChoices, me: string | undefined, today: string, horizon: number): Notice[] {
  if (!choices.on) return [];
  const byDay = new Map<string, Chore[]>();
  for (const chore of chores) {
    if (choices.onlyMine && me && chore.who && chore.who !== me) continue;
    const day = nextDay(chore);
    if (!day || day < today || day > addDays(today, horizon)) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), chore]);
  }
  return [...byDay].map(([day, list]) => {
    const names = list.map((chore) => chore.name).sort((a, b) => a.localeCompare(b));
    return {
      key: `ergon:${day}:${names.join('|').slice(0, 80)}`,
      kind: 'chore' as const,
      at: atTime(day, choices.at),
      title: names.length === 1 ? names[0] : `${names.length} chores`,
      body: names.length === 1 ? 'Today.' : names.join(', '),
      open: 'ergon',
    };
  });
}
