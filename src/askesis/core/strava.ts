import type { Activity, LogEntry } from './log';

/** One activity as the site's Strava bridge passes it on (worker/strava.ts). */
export type StravaActivity = { id: number; type: string; start: string; seconds?: number; meters?: number; avgHr?: number; name?: string };

/** Strava's sport types, in Askesis's words. */
export function activityFor(type: string): Activity {
  if (/run/i.test(type)) return 'run';
  if (/hike/i.test(type)) return 'hike';
  if (/walk/i.test(type)) return 'walk';
  if (/ride|bike|cycl/i.test(type)) return 'bike';
  return 'other';
}

/** Strava's default names say only the time of day; those are left out of the notes. */
const PLAIN_NAME = /^(morning|lunch|afternoon|evening|night) (run|walk|hike|ride|workout|trail run|activity)$/i;

/** Already in the log: the same Strava activity, or the same day and kind about the same distance (a watch file, or typed in). */
function alreadyLogged(activity: StravaActivity, kind: Activity, date: string, log: readonly LogEntry[]): boolean {
  return log.some(
    (entry) =>
      entry.stravaId === activity.id ||
      entry.id === `strava-${activity.id}` ||
      (entry.date === date &&
        entry.activity === kind &&
        entry.meters !== undefined &&
        activity.meters !== undefined &&
        Math.abs(entry.meters - activity.meters) <= Math.max(150, activity.meters * 0.03)),
  );
}

/**
 * The new entries from Strava's activities: never one already in the log. A run on a day with one open session in the
 * plan counts as that session (`openSession` says which, for a date), as it would when logged by hand.
 */
export function entriesFromStrava(
  activities: readonly StravaActivity[],
  log: readonly LogEntry[],
  openSession: (date: string) => { id: string; title: string } | undefined,
  now = new Date(),
): LogEntry[] {
  const added: LogEntry[] = [];
  const taken = new Set<string>();
  for (const activity of [...activities].sort((a, b) => a.start.localeCompare(b.start))) {
    // Strava's local start time is written as if it were UTC; the first ten characters are the local date.
    const date = activity.start.slice(0, 10);
    const kind = activityFor(activity.type);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || alreadyLogged(activity, kind, date, [...log, ...added])) continue;
    const session = kind === 'run' || kind === 'walk' ? openSession(date) : undefined;
    const linked = session && !taken.has(session.id) ? session : undefined;
    if (linked) taken.add(linked.id);
    added.push({
      // The same id on every device, so two devices bringing in the same workout make one record once they sync.
      id: `strava-${activity.id}`,
      date,
      activity: kind,
      seconds: activity.seconds ? Math.round(activity.seconds) : undefined,
      meters: activity.meters ? Math.round(activity.meters) : undefined,
      avgHr: activity.avgHr ? Math.round(activity.avgHr) : undefined,
      notes: activity.name && !PLAIN_NAME.test(activity.name.trim()) ? activity.name.trim() : undefined,
      workoutId: linked?.id,
      workoutTitle: linked?.title,
      stravaId: activity.id,
      createdAt: now.toISOString(),
    });
  }
  return added;
}

/** Where to ask Strava from next: the newest start already brought in, less a day (late uploads from a watch). */
export function nextAfter(previous: number | undefined, activities: readonly StravaActivity[]): number {
  const newest = activities.reduce((latest, each) => Math.max(latest, Date.parse(`${each.start.slice(0, 19)}Z`) / 1000 || 0), previous ?? 0);
  return Math.max(previous ?? 0, newest - 86_400);
}
