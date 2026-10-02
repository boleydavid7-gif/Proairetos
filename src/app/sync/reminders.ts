import type { Decision } from '../../core/decisions/types';
import type { LifeItem } from '../../core/life-items/types';
import { defaultNoticeSettings, noticesBetween, type Notice } from '../../core/notify/notices';
import type { QuietHours } from '../../core/rhythm/quietHours';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const HORIZON_DAYS = 14;

async function opaqueId(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * What the server may know about notices: when each is due, under an id it
 * cannot read back. The words stay on the device, which writes the
 * notification itself when the (empty) push arrives.
 */
export function reminderTimes(notices: readonly Notice[]) {
  return Promise.all(
    notices.map(async (notice) => ({ id: await opaqueId(`${notice.key}:${notice.at.toISOString()}`), fire_at: notice.at.toISOString() })),
  );
}

/** Reminder times for the next two weeks, from items and decisions (calendars and settings optional). */
export async function upcomingReminders(
  items: LifeItem[],
  decisions: Decision[],
  now: Date,
  hold?: { quiet: QuietHours; blocks: readonly ScheduleOccurrence[] },
) {
  const notices = noticesBetween({
    items,
    decisions,
    events: [],
    blocks: [],
    holding: hold?.blocks,
    settings: { ...defaultNoticeSettings, calendars: false },
    quiet: hold?.quiet,
    now,
    until: new Date(now.getTime() + HORIZON_DAYS * 86_400_000),
  });
  return reminderTimes(notices);
}
