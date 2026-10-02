import type { Decision } from '../../core/decisions/types';
import type { LifeItem } from '../../core/life-items/types';
import { atTime, toLocalDate } from '../../core/scheduling/dates';
import { deliverAt, type QuietHours } from '../../core/rhythm/quietHours';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const HORIZON_DAYS = 14;
const MORNING = '09:00';

async function opaqueId(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * When reminders fire, from what the person set: scheduled times,
 * check-back days, and decision look-back days (at 9:00 local). Only these
 * times and hashed ids leave the device.
 */
export async function upcomingReminders(
  items: LifeItem[],
  decisions: Decision[],
  now: Date,
  hold?: { quiet: QuietHours; blocks: readonly ScheduleOccurrence[] },
) {
  const horizon = now.getTime() + HORIZON_DAYS * 86_400_000;
  const times: { key: string; at: Date }[] = [];

  for (const item of items) {
    if (item.status !== 'OPEN' && item.status !== 'WAITING') continue;
    // Lists that come back appear on Plan by themselves; they never ping.
    if (item.scheduledAt && !item.checklist) times.push({ key: `scheduled:${item.id}`, at: new Date(item.scheduledAt) });
    if (item.status === 'WAITING' && item.checkBackAt) {
      times.push({ key: `check-back:${item.id}`, at: atTime(toLocalDate(new Date(item.checkBackAt)), MORNING) });
    }
  }
  for (const decision of decisions) {
    if (decision.revisitAt && !decision.revisitedAt) {
      times.push({ key: `look-back:${decision.id}`, at: atTime(toLocalDate(new Date(decision.revisitAt)), MORNING) });
    }
  }

  // Quiet hours and protected time hold a reminder until they end; nothing is dropped.
  const held = hold ? times.map((t) => ({ ...t, at: deliverAt(t.at, hold.quiet, hold.blocks) })) : times;
  const due = held.filter((t) => t.at.getTime() > now.getTime() && t.at.getTime() <= horizon);
  return Promise.all(
    due.map(async (t) => ({ id: await opaqueId(`${t.key}:${t.at.toISOString()}`), fire_at: t.at.toISOString() })),
  );
}
