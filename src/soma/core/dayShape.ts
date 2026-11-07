import { addDays } from '../../core/scheduling/dates';

/**
 * What the person's own schedule (from Proairetos) says about cooking: a
 * block running through the evening today, or a run of late blocks ahead.
 * It only offers; the person's schedule is theirs to name ("Work", "Class",
 * a rota), so the words come from it.
 */
export type Block = { kind: 'COMMITTED' | 'PROTECTED'; name: string; date: string; start: Date; end: Date };

export type DayShape = {
  /** "Work until 7:00 PM", "Work 3:00 PM – 11:30 PM". */
  today?: string;
  /** A committed block through the usual evening meal (17:00-20:00) today. */
  busyEvening: boolean;
  /** Days ahead (within four) with a block starting from 18:00 or running past midnight. */
  lateDays: string[];
};

const clock = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const at = (day: string, hour: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};

export function isLate(block: Block): boolean {
  return block.start.getHours() >= 18 || block.end.getDate() !== block.start.getDate();
}

export function dayShape(blocks: readonly Block[], today: string, now: Date): DayShape {
  const committed = blocks.filter((block) => block.kind === 'COMMITTED').sort((a, b) => a.start.getTime() - b.start.getTime());
  const evening = { from: at(today, 17), to: at(today, 20) };
  const todays = committed.filter((block) => block.end > now && block.start < at(addDays(today, 1), 3));
  const busy = todays.find((block) => block.start < evening.to && block.end > evening.from);
  const shown = busy ?? todays[0];
  const words = shown
    ? shown.start <= now
      ? `${shown.name} until ${clock(shown.end)}`
      : `${shown.name} ${clock(shown.start)} – ${clock(shown.end)}`
    : undefined;
  const ahead = new Set<string>();
  for (const block of committed) {
    if (block.date > today && block.date <= addDays(today, 4) && isLate(block)) ahead.add(block.date);
  }
  return { today: words, busyEvening: Boolean(busy), lateDays: [...ahead].sort() };
}
