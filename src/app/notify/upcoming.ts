import { noticesBetween, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { loadNotify, loadQuietHours } from '../../data/storage/preferences';
import { otherCalendars } from '../calendars/otherCalendars';
import { decisionService, lifeService, scheduleService } from '../services';

const HORIZON_DAYS = 14;

/** Everything due in the next two weeks, from what is on this device. */
export async function upcomingNotices(now = new Date(), settings: NoticeSettings = loadNotify()): Promise<Notice[]> {
  const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const [items, decisions, own] = await Promise.all([
    lifeService.list(),
    decisionService.list(),
    scheduleService.occurrencesBetween(now, until),
  ]);
  return noticesBetween({
    items,
    decisions,
    events: otherCalendars.eventsBetween(now, until),
    blocks: own,
    holding: [...own, ...otherCalendars.blocksBetween(now, until)],
    settings,
    quiet: loadQuietHours(),
    now,
    until,
  });
}
