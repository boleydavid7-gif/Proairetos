import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';

/*
 * Diaita plans sleep, naps, light, caffeine and meals around the person's own schedule (read from
 * Proairetos). Every line is a time, with the study it comes from; nothing is scored, and the person can
 * change any setting it rests on.
 */

export type WorkBlock = { start: Date; end: Date; label?: string; kind?: 'COMMITTED' | 'PROTECTED' };

export type RhythmSettings = {
  /** Usual bedtime on an ordinary night, "HH:MM". */
  bedtime: string;
  /** Hours of sleep the person aims for. */
  sleepHours: number;
  /** Hours between the last caffeine and sleep. */
  cutoffHours: number;
  /** Minutes from leaving work to being home. */
  commuteMinutes: number;
  /** Minutes before sleep to wind down (0 for none). */
  windDownMinutes: number;
  /** Minutes from waking to leaving for work. */
  readyMinutes: number;
  meals: boolean;
  light: boolean;
};

export const defaultRhythm: RhythmSettings = {
  bedtime: '22:30',
  sleepHours: 7.5,
  cutoffHours: 6,
  commuteMinutes: 30,
  windDownMinutes: 45,
  readyMinutes: 60,
  meals: true,
  light: true,
};

export type SourceKey = 'sleep' | 'caffeine' | 'nap' | 'light' | 'night-meals' | 'hygiene';

export const SOURCES: Record<SourceKey, string> = {
  sleep: 'Watson NF et al. Recommended amount of sleep for a healthy adult. Sleep 2015;38(6):843–844.',
  caffeine: 'Drake C et al. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 2013;9(11):1195–1200.',
  nap: 'Ruggiero JS, Redeker NS. Effects of napping on sleepiness and sleep-related performance deficits in night-shift workers: a systematic review. Biol Res Nurs 2014;16(2):134–142.',
  light: 'Smith MR, Fogg LF, Eastman CI. A compromise circadian phase position for permanent night work improves mood, fatigue, and performance. Sleep 2009;32(11):1481–1489.',
  'night-meals': 'Chellappa SL et al. Daytime eating prevents internal circadian misalignment and glucose intolerance in night work. Sci Adv 2021;7(49):eabg9910.',
  hygiene: 'Shriane AE et al. Sleep hygiene in shift workers: a systematic literature review. Sleep Med Rev 2020;53:101336.',
};

export type EntryKind = 'work' | 'sleep' | 'wake' | 'nap' | 'wind-down' | 'caffeine' | 'light' | 'dark' | 'meal' | 'light-food';

export type Entry = {
  key: string;
  kind: EntryKind;
  start: Date;
  end?: Date;
  title: string;
  detail?: string;
  source?: SourceKey;
};

export type Sleep = { start: Date; end: Date; after: 'evening' | 'night' | 'last-night' };

export type DayKind = 'off' | 'day' | 'evening' | 'night' | 'after-nights';

export const DAY_NAMES: Record<DayKind, string> = {
  off: 'Day off',
  day: 'Day',
  evening: 'Evening',
  night: 'Night',
  'after-nights': 'After nights',
};

const HOUR = 3_600_000;
const MINUTE = 60_000;
const later = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MINUTE);

const work = (blocks: readonly WorkBlock[]) =>
  blocks.filter((block) => (block.kind ?? 'COMMITTED') === 'COMMITTED' && block.end > block.start).sort((a, b) => a.start.getTime() - b.start.getTime());

/** A night is any block that runs through 03:00. */
export function isNight(block: WorkBlock): boolean {
  let at = atTime(toLocalDate(block.start), '03:00');
  if (at < block.start) at = atTime(addDays(toLocalDate(block.start), 1), '03:00');
  return at < block.end;
}

const startsOn = (block: WorkBlock, date: string) => toLocalDate(block.start) === date;

export function dayKind(date: string, blocks: readonly WorkBlock[]): DayKind {
  const all = work(blocks);
  const today = all.filter((block) => startsOn(block, date));
  if (today.some(isNight)) return 'night';
  const yesterday = all.filter((block) => startsOn(block, addDays(date, -1)));
  if (today.length === 0) return yesterday.some(isNight) ? 'after-nights' : 'off';
  const lateEnd = today.some((block) => block.end.getTime() >= atTime(date, '21:00').getTime());
  return lateEnd ? 'evening' : 'day';
}

/**
 * The main sleeps from the evening before `from` to the night after `until`: after an ordinary day at
 * bedtime (earlier for an early start, later after a late finish), after a night shift once home.
 * After the last night of a run, a short sleep, so the night that follows is a full one.
 */
export function mainSleeps(from: string, until: string, blocks: readonly WorkBlock[], settings: RhythmSettings): Sleep[] {
  const all = work(blocks);
  const length = settings.sleepHours * 60;
  const sleeps: Sleep[] = [];
  for (let date = addDays(from, -1); date <= until; date = addDays(date, 1)) {
    const night = all.find((block) => startsOn(block, date) && isNight(block));
    if (night) {
      const start = later(night.end, settings.commuteMinutes);
      const nextNight = all.find((block) => block !== night && isNight(block) && block.start > night.end && block.start.getTime() - night.end.getTime() < 24 * HOUR);
      if (nextNight) {
        // Up in time to eat and nap before the next night if it wants one.
        const latest = later(nextNight.start, -(settings.readyMinutes + settings.commuteMinutes));
        const end = new Date(Math.min(later(start, length).getTime(), latest.getTime()));
        sleeps.push({ start, end, after: 'night' });
      } else {
        sleeps.push({ start, end: later(start, Math.min(length, 240)), after: 'last-night' });
      }
      continue;
    }
    let start = atTime(date, settings.bedtime);
    if (start.getHours() < 12) start = atTime(addDays(date, 1), settings.bedtime);
    // Finished late: home, then a short wind-down.
    for (const block of all) {
      if (block.end > later(start, -(settings.commuteMinutes + 30)) && block.start < start) {
        start = new Date(Math.max(start.getTime(), later(block.end, settings.commuteMinutes + 30).getTime()));
      }
    }
    let end = later(start, length);
    // An early start: to bed earlier so the sleep is whole.
    const next = all.find((block) => block.start >= start && block.start.getTime() - start.getTime() < 18 * HOUR);
    if (next) {
      const upBy = later(next.start, -(settings.readyMinutes + settings.commuteMinutes));
      if (upBy < end) {
        end = upBy;
        start = new Date(Math.max(later(upBy, -length).getTime(), later(start, -180).getTime()));
      }
    }
    if (end > start) sleeps.push({ start, end, after: 'evening' });
  }
  return sleeps;
}

/** Everything Diaita suggests between two dates, in time order. */
export function planBetween(from: string, until: string, blocks: readonly WorkBlock[], settings: RhythmSettings): Entry[] {
  const all = work(blocks);
  const sleeps = mainSleeps(from, until, blocks, settings);
  const entries: Entry[] = [];
  const add = (entry: Entry) => entries.push(entry);
  const stamp = (date: Date) => date.toISOString();

  for (const block of all) {
    add({ key: `work:${stamp(block.start)}`, kind: 'work', start: block.start, end: block.end, title: block.label || 'Work' });
  }

  for (const sleep of sleeps) {
    add({ key: `sleep:${stamp(sleep.start)}`, kind: 'sleep', start: sleep.start, end: sleep.end, title: sleep.after === 'last-night' ? 'Short sleep' : 'Sleep', source: sleep.after === 'evening' ? 'sleep' : sleep.after === 'night' ? 'light' : 'hygiene' });
    add({ key: `wake:${stamp(sleep.end)}`, kind: 'wake', start: sleep.end, title: 'Up' });
    if (settings.windDownMinutes > 0 && sleep.after === 'evening') {
      add({ key: `wind:${stamp(sleep.start)}`, kind: 'wind-down', start: later(sleep.start, -settings.windDownMinutes), end: sleep.start, title: 'Wind down', detail: 'Dim lights, screens away', source: 'hygiene' });
    }
    if (settings.cutoffHours > 0) {
      add({ key: `caffeine:${stamp(sleep.start)}`, kind: 'caffeine', start: later(sleep.start, -settings.cutoffHours * 60), title: 'Last caffeine', source: 'caffeine' });
    }
    if (settings.meals && sleep.after === 'evening') {
      add({ key: `meal:${stamp(sleep.start)}`, kind: 'meal', start: later(sleep.start, -180), title: 'Last big meal', source: 'hygiene' });
    }
    if (settings.light && sleep.after !== 'night') {
      const wake = sleep.end;
      if (wake.getHours() >= 5 && wake.getHours() < 18) {
        add({ key: `daylight:${stamp(wake)}`, kind: 'light', start: later(wake, 15), end: later(wake, 45), title: 'Daylight', detail: 'Outside if you can', source: sleep.after === 'last-night' ? 'hygiene' : 'light' });
      }
    }
  }

  for (const night of all.filter(isNight)) {
    const before = sleeps.filter((sleep) => sleep.end <= night.start).pop();
    const leave = later(night.start, -settings.commuteMinutes);
    // A nap when the last sleep ended long before the shift (the first night of a run).
    if (!before || night.start.getTime() - before.end.getTime() > 9 * HOUR) {
      const end = later(leave, -60);
      const start = later(end, -90);
      if (!before || start.getTime() - before.end.getTime() >= 4 * HOUR) {
        add({ key: `nap:${stamp(start)}`, kind: 'nap', start, end, title: 'Nap', detail: '90 minutes', source: 'nap' });
      }
    }
    if (settings.meals) {
      add({ key: `main-meal:${stamp(night.start)}`, kind: 'meal', start: later(leave, -45), title: 'Main meal', detail: 'Before work', source: 'night-meals' });
      const midnight = atTime(addDays(toLocalDate(night.start), night.start.getHours() >= 12 ? 1 : 0), '00:00');
      const lightFrom = new Date(Math.max(midnight.getTime(), night.start.getTime()));
      const lightUntil = new Date(Math.min(later(midnight, 360).getTime(), night.end.getTime()));
      if (lightUntil > lightFrom) {
        add({ key: `light-food:${stamp(lightFrom)}`, kind: 'light-food', start: lightFrom, end: lightUntil, title: 'Small snacks only', source: 'night-meals' });
      }
    }
    if (settings.light) {
      const middle = new Date((night.start.getTime() + night.end.getTime()) / 2);
      add({ key: `bright:${stamp(night.start)}`, kind: 'light', start: night.start, end: middle, title: 'Bright light', detail: 'First half of the shift', source: 'light' });
      const after = sleeps.find((sleep) => sleep.start >= night.end && sleep.start.getTime() - night.end.getTime() < 3 * HOUR);
      if (after?.after === 'night') {
        add({ key: `dark:${stamp(night.end)}`, kind: 'dark', start: night.end, end: after.start, title: 'Sunglasses home', detail: 'Then a dark room', source: 'light' });
      }
    }
  }

  return entries.sort((a, b) => a.start.getTime() - b.start.getTime() || order(a.kind) - order(b.kind));
}

const ORDER: EntryKind[] = ['wake', 'light', 'meal', 'caffeine', 'nap', 'work', 'light-food', 'dark', 'wind-down', 'sleep'];
const order = (kind: EntryKind) => ORDER.indexOf(kind);

/** Entries for one day, by the day each belongs to (the person's day in the app; calendar days in tests). */
export function entriesOn(date: string, entries: readonly Entry[], dayOf: (when: Date) => string = toLocalDate): Entry[] {
  return entries.filter((entry) => dayOf(entry.start) === date);
}

// ---------- The sleep log ----------

export type SleepQuality = 'well' | 'okay' | 'poorly';

export type SleepRecord = {
  /** The day woken into. */
  date: string;
  /** "HH:MM" */
  bed: string;
  up: string;
  how?: SleepQuality;
  note?: string;
};

export const QUALITY_NAMES: Record<SleepQuality, string> = { well: 'Well', okay: 'Okay', poorly: 'Poorly' };

/** Minutes asleep from bed to up (past midnight when up is earlier than bed). */
export function sleptMinutes(record: Pick<SleepRecord, 'bed' | 'up'>): number {
  const [bh, bm] = record.bed.split(':').map(Number);
  const [uh, um] = record.up.split(':').map(Number);
  let minutes = uh * 60 + um - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes;
}

export function hoursText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Plain facts over a run of records: how many, the average length, and how many were marked each way. */
export function sleepFacts(records: readonly SleepRecord[]) {
  if (records.length === 0) return undefined;
  const total = records.reduce((sum, record) => sum + sleptMinutes(record), 0);
  const marked = { well: 0, okay: 0, poorly: 0 } as Record<SleepQuality, number>;
  for (const record of records) if (record.how) marked[record.how] += 1;
  return { nights: records.length, averageMinutes: Math.round(total / records.length), marked };
}

/** What the plan expects for the sleep that ended on this day, as times for the check-in. */
export function plannedSleepInto(date: string, entries: readonly Entry[]): { bed: string; up: string } | undefined {
  const sleep = entries.filter((entry) => entry.kind === 'sleep' && entry.end && toLocalDate(entry.end) === date).pop();
  if (!sleep?.end) return undefined;
  return { bed: clock(sleep.start), up: clock(sleep.end) };
}

export function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** A time as the phone shows times (12 or 24 hour). */
export function timeText(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** A stored "HH:MM" shown as the phone shows times. */
export function clockText(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return timeText(new Date(2000, 0, 1, hours, minutes));
}
