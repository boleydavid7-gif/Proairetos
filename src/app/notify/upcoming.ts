import { noticesBetween, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { loadNotify, loadQuietHours } from '../../data/storage/preferences';
import { readRuns, runTimes } from '../askesis/runs';
import { readStore } from '../family/read';
import { billReminders } from '../../oikonomia/core/reminders';
import type { Bill } from '../../oikonomia/core/bills';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { otherCalendars } from '../calendars/otherCalendars';
import { decisionService, lifeService, scheduleService } from '../services';

const HORIZON_DAYS = 14;

/** Everything due in the next two weeks, from what is on this device. */
export async function upcomingNotices(now = new Date(), settings: NoticeSettings = loadNotify()): Promise<Notice[]> {
  const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const [items, decisions, own, runs, bills] = await Promise.all([
    lifeService.list(),
    decisionService.list(),
    scheduleService.occurrencesBetween(now, until),
    settings.runs ? readRuns() : undefined,
    settings.bills ? readStore<Bill>('oikonomiaBills') : [],
  ]);
  const today = toLocalDate(now);
  return noticesBetween({
    items,
    decisions,
    events: otherCalendars.eventsBetween(now, until),
    blocks: own,
    holding: [...own, ...otherCalendars.blocksBetween(now, until)],
    runs: runs ? runTimes(runs, now, until) : [],
    bills: billReminders(bills, today, addDays(today, HORIZON_DAYS)),
    settings,
    quiet: loadQuietHours(),
    now,
    until,
  });
}
