import { noticesBetween, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { loadNotify, loadQuietHours } from '../../data/storage/preferences';
import { readRuns, runTimes } from '../askesis/runs';
import { readStore } from '../family/read';
import { billReminders } from '../../oikonomia/core/reminders';
import type { Bill } from '../../oikonomia/core/bills';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { loadFocusSession } from '../../data/storage/preferences';
import type { FocusSession } from '../../core/focus/session';
import { otherCalendars } from '../calendars/otherCalendars';
import { decisionService, lifeService, scheduleService } from '../services';
import { hydrationNotices, hydrationWantsWork } from './hydrationSchedule';

const HORIZON_DAYS = 14;

/** Everything due in the next two weeks, from what is on this device. */
export async function upcomingNotices(now = new Date(), settings: NoticeSettings = loadNotify()): Promise<Notice[]> {
  const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const [items, decisions, own, runs, bills, study] = await Promise.all([
    lifeService.list(),
    decisionService.list(),
    scheduleService.occurrencesBetween(now, until),
    settings.runs ? readRuns() : undefined,
    settings.bills ? readStore<Bill>('oikonomiaBills') : [],
    settings.study ? studyEnd() : undefined,
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
    study,
    settings,
    quiet: loadQuietHours(),
    now,
    until,
  });
}

/** When the Praxis block running now ends (none while paused, or for Proairetos's own focus timer). */
async function studyEnd(): Promise<{ key: string; at: Date; title: string } | undefined> {
  const session = loadFocusSession<FocusSession>();
  if (!session?.itemId || session.pausedAt) return undefined;
  const blocks = await lifeService.listForApp('praxis');
  const block = blocks.find((each) => each.id === session.itemId);
  if (!block) return undefined;
  const at = new Date(session.startedAt + session.pausedMs + session.durationMs);
  return { key: `${session.startedAt}:${at.getTime()}`, at, title: session.itemTitle ?? block.title };
}

/** Water reminders, with the last drink logged and (when chosen) the work blocks they keep to. */
export async function hydrationUpcoming(now: Date): Promise<Notice[]> {
  const drinks = await readStore<{ loggedAt?: string }>('hydrosDrinks');
  const last = drinks.map((drink) => drink.loggedAt ?? '').filter(Boolean).sort().pop();
  let work: { start: Date; end: Date }[] = [];
  if (hydrationWantsWork()) {
    const until = new Date(now.getTime() + 15 * 86_400_000);
    const from = new Date(now.getTime() - 86_400_000);
    work = [...(await scheduleService.occurrencesBetween(from, until)), ...otherCalendars.blocksBetween(from, until)].filter((block) => block.kind === 'COMMITTED');
  }
  return hydrationNotices(now, loadQuietHours(), { lastDrinkAt: last ? new Date(last) : undefined, work });
}
