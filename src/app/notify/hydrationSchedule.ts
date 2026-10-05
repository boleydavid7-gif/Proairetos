import { deliverAt, type QuietHours } from '../../core/rhythm/quietHours';
import type { Notice } from '../../core/notify/notices';

const HORIZON_DAYS = 14;
const MAX_NOTICES = 500;

let schedule: { enabled: boolean; intervalMinutes: number } | undefined;

function currentSchedule(): { enabled: boolean; intervalMinutes: number } {
  if (schedule) return schedule;
  try {
    const saved = JSON.parse(localStorage.getItem('hydros:settings') ?? '{}') as { reminders?: unknown; reminderIntervalMinutes?: unknown };
    schedule = {
      enabled: saved.reminders === true,
      intervalMinutes: Number.isFinite(saved.reminderIntervalMinutes) ? Number(saved.reminderIntervalMinutes) : 120,
    };
  } catch {
    schedule = { enabled: false, intervalMinutes: 120 };
  }
  return schedule;
}

function intervalMs(): number {
  return Math.max(15, Math.min(240, Math.round(currentSchedule().intervalMinutes))) * 60_000;
}

/** Keeps Hydros' setting available to both the open-app and server schedulers. */
export function setHydrationSchedule(next: { enabled: boolean; intervalMinutes: number }): void {
  schedule = {
    enabled: next.enabled,
    intervalMinutes: Number.isFinite(next.intervalMinutes) ? next.intervalMinutes : 120,
  };
}

/** Builds the next two weeks of Hydros reminders, respecting quiet hours. */
export function hydrationNotices(now = new Date(), quiet: QuietHours): Notice[] {
  if (!currentSchedule().enabled) return [];
  const interval = intervalMs();
  const until = now.getTime() + HORIZON_DAYS * 86_400_000;
  const notices: Notice[] = [];
  let cursor = new Date(now.getTime() + interval);

  while (cursor.getTime() <= until && notices.length < MAX_NOTICES) {
    const due = deliverAt(cursor, quiet, []);
    if (due.getTime() > until) break;
    notices.push({
      key: `hydros:hydration:${due.toISOString()}`,
      kind: 'hydration',
      at: due,
      title: 'Hydros',
      body: 'A measured drink keeps the day in motion.',
      open: 'today',
    });
    // Count the interval from delivery, so a quiet period does not create a
    // burst of reminders at its end.
    cursor = new Date(due.getTime() + interval);
  }

  return notices;
}
