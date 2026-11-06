import { readRuns, runTimes } from '../../app/askesis/runs';
import { defaultNoticeSettings, noticesBetween } from '../../core/notify/notices';
import { noticeLine, type Provider } from '../../core/providers';

/**
 * Run days at the time the runner chose: this week's by name, next week's as "Run day", with the place when they gave one.
 * The words are made by the same function that words every timed notice (`noticesBetween`), given only the run times, so
 * "At 6:30 AM · River path" is said exactly as before. A run is said at its own time and quiet hours do not move it.
 */
export const askesisNotices: Provider<'notices'> = {
  app: 'askesis',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['askesisWorkouts', 'askesisPlans'],
  read: async (ctx) => {
    const until = ctx.range?.until ?? ctx.now;
    const runs = runTimes(await readRuns(), ctx.now, until);
    const notices = noticesBetween({ items: [], decisions: [], events: [], blocks: [], runs, settings: { ...defaultNoticeSettings, runs: true }, now: ctx.now, until });
    return notices.filter((notice) => notice.kind === 'run').map((notice) => noticeLine('askesis', notice));
  },
};
