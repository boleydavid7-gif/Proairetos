import { deliverAt, type QuietHours } from '../../core/rhythm/quietHours';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import type { Notice } from '../../core/notify/notices';

const HORIZON_DAYS = 14;
const MAX_NOTICES = 400;

export type HydrationSchedule = { enabled: boolean; intervalMinutes: number; when?: 'waking' | 'work' };

let schedule: HydrationSchedule | undefined;

function currentSchedule(): HydrationSchedule {
  if (schedule) return schedule;
  try {
    const saved = JSON.parse(localStorage.getItem('hydros:settings') ?? '{}') as { reminders?: unknown; reminderIntervalMinutes?: unknown; reminderWhen?: unknown };
    schedule = {
      enabled: saved.reminders === true,
      intervalMinutes: Number.isFinite(saved.reminderIntervalMinutes) ? Number(saved.reminderIntervalMinutes) : 120,
      when: saved.reminderWhen === 'work' ? 'work' : 'waking',
    };
  } catch {
    schedule = { enabled: false, intervalMinutes: 120, when: 'waking' };
  }
  return schedule;
}

/** Keeps Hydros' setting available to both the open-app and server schedulers. */
export function setHydrationSchedule(next: HydrationSchedule): void {
  schedule = {
    enabled: next.enabled,
    intervalMinutes: Number.isFinite(next.intervalMinutes) ? next.intervalMinutes : 120,
    when: next.when ?? currentSchedule().when ?? 'waking',
  };
}

/** Whether the Hydros schedule wants work blocks to be read. */
export function hydrationWantsWork(): boolean {
  const current = currentSchedule();
  return current.enabled && current.when === 'work';
}

export type HydrationContext = {
  /** When the last drink was logged; reminders count from it. */
  lastDrinkAt?: Date;
  /** Work blocks, for "only during work". */
  work?: readonly { start: Date; end: Date }[];
  time?: (date: Date) => string;
};

const defaultTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * Water reminders for the next two weeks, at steady clock times: every chosen interval from the end of quiet
 * hours through the waking day, or through each work block when chosen (quiet hours do not apply inside work,
 * so a night shift has them). None comes sooner than one interval after the last drink logged. Each says
 * only when the last drink was logged.
 */
export function hydrationNotices(now: Date, quiet: QuietHours, context: HydrationContext = {}): Notice[] {
  const current = currentSchedule();
  if (!current.enabled) return [];
  const interval = Math.max(15, Math.min(240, Math.round(current.intervalMinutes))) * 60_000;
  const until = now.getTime() + HORIZON_DAYS * 86_400_000;
  const after = Math.max(now.getTime(), (context.lastDrinkAt?.getTime() ?? 0) + interval - 60_000);
  const time = context.time ?? defaultTime;
  const times: Date[] = [];

  if (current.when === 'work') {
    for (const block of context.work ?? []) {
      for (let at = block.start.getTime() + interval; at < block.end.getTime(); at += interval) times.push(new Date(at));
    }
  } else {
    const today = toLocalDate(now);
    const waking = quiet.on && quiet.start !== quiet.end ? quiet.end : '07:00';
    const sleeping = quiet.on && quiet.start !== quiet.end ? quiet.start : '22:00';
    for (let index = -1; index <= HORIZON_DAYS; index += 1) {
      const day = addDays(today, index);
      const start = atTime(day, waking).getTime();
      const end = atTime(sleeping > waking ? day : addDays(day, 1), sleeping).getTime();
      for (let at = start + interval; at < end; at += interval) {
        // Only times that quiet hours and protected time leave as they are.
        if (deliverAt(new Date(at), quiet, []).getTime() === at) times.push(new Date(at));
      }
    }
  }

  const last = context.lastDrinkAt;
  const lastWords = (at: Date) => {
    if (!last) return 'Nothing logged yet.';
    const sameDay = toLocalDate(last) === toLocalDate(at);
    return sameDay ? `Last drink logged ${time(last)}.` : `Last drink logged ${last.toLocaleDateString(undefined, { weekday: 'long' })}, ${time(last)}.`;
  };

  return times
    .filter((at) => at.getTime() > after && at.getTime() <= until)
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, MAX_NOTICES)
    .map((at) => ({
      key: `hydros:hydration:${at.toISOString()}`,
      kind: 'hydration' as const,
      at,
      title: 'Water',
      body: lastWords(at),
      open: 'hydros',
    }));
}
