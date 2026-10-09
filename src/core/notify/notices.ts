import type { ExternalEvent } from '../calendar/readIcs';
import type { Decision } from '../decisions/types';
import type { LifeItem } from '../life-items/types';
import { deliverAt, type QuietHours } from '../rhythm/quietHours';
import { addDays, atTime, toLocalDate } from '../scheduling/dates';
import type { ScheduleOccurrence } from '../scheduling/types';

/**
 * Notifications, worked out on the device from what the person set. Each
 * notice says plainly what and when, never what to do about it, and never
 * follows up: one notice per reminder the person asked for, nothing more.
 * Quiet hours and protected time hold a notice until they end.
 */
export type NoticeKind = 'item' | 'calendar' | 'schedule' | 'check-back' | 'look-back' | 'day' | 'run' | 'hydration' | 'bell';

export type Notice = {
  /** Stable for this reminder at this time; also the notification's tag. */
  key: string;
  kind: NoticeKind;
  at: Date;
  title: string;
  body: string;
  /** Where a tap opens the app: an item, Days ahead, or Today. */
  open: string;
};

/** Minutes before a time; 0 is at the time itself. */
export const remindChoices = [0, 5, 15, 30, 60, 90, 120, 1440] as const;

/** Lead times used for calendar and schedule notifications. */
export const noticeLeadChoices = [0, 5, 10, 15, 30, 60, 90, 120] as const;

/** Keeps older saved settings from turning a "before" reminder into an after reminder. */
export function normalizeLeadMinutes(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(120, Math.abs(Math.round(value!)));
}

export function remindLabel(minutes: number): string {
  if (minutes === 0) return 'At the time';
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes === 60) return '1 hour before';
  if (minutes % 1440 === 0) return minutes === 1440 ? '1 day before' : `${minutes / 1440} days before`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${remainder ? ` ${remainder} minutes` : ''} before`;
}

export function noticeLeadLabel(minutes: number): string {
  if (minutes === 0) return 'At the start';
  if (minutes < 60) return `${minutes} minutes before`;
  return remindLabel(minutes);
}

/** An item's reminders: as the person set them, or at the time if they never chose. */
export function remindersOf(item: LifeItem): readonly number[] {
  const values = item.remind ?? [0];
  return [...new Set(values.filter(Number.isFinite).map((minutes) => Math.abs(Math.round(minutes))))].sort((a, b) => a - b);
}

export type NoticeSettings = {
  /** Things with a time, as each one's own reminders say. */
  items: boolean;
  /** Timed events from other calendars, this many minutes before (0 = at the start). */
  calendars: boolean;
  calendarLead: number;
  /** Blocks of the person's own schedule (work, study, care), this many minutes before. */
  schedule: boolean;
  scheduleLead: number;
  checkBacks: boolean;
  lookBacks: boolean;
  /** A short look at the day, at this time, if wanted. */
  day: boolean;
  dayAt: string;
  /** A soft bell at times the person chooses, with one quiet line. */
  bell: boolean;
  bellAt: string[];
  /** Run days from Askesis, at the time the runner chose. */
  runs: boolean;
  /** What the lock screen shows: the details, or only that something is due. */
  details: boolean;
};

export const defaultNoticeSettings: NoticeSettings = {
  items: true,
  calendars: true,
  calendarLead: 10,
  schedule: false,
  scheduleLead: 30,
  checkBacks: true,
  lookBacks: true,
  day: false,
  dayAt: '08:00',
  bell: false,
  bellAt: ['10:30', '15:00'],
  runs: true,
  details: true,
};

const MORNING = '09:00';

type Sources = {
  items: readonly LifeItem[];
  decisions: readonly Decision[];
  events: readonly ExternalEvent[];
  /** The person's own schedule blocks (for schedule notices and the day's look). */
  blocks: readonly ScheduleOccurrence[];
  /** Everything that can hold a notice as protected time; defaults to `blocks`. */
  holding?: readonly ScheduleOccurrence[];
  /** Sessions on run days, at the runner's own time (from Askesis). */
  runs?: readonly RunTime[];
  settings: NoticeSettings;
  quiet?: QuietHours;
  now: Date;
  until: Date;
  time?: (date: Date) => string;
};

export type RunTime = { key: string; at: Date; title: string; place?: string };

const defaultTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "In 15 minutes", "In 1 hour", "Tomorrow"; or nothing when it is now or already begun. */
function ahead(minutes: number): string | undefined {
  if (minutes <= 0) return undefined;
  if (minutes < 60) return `In ${minutes} minutes`;
  if (minutes < 120) return minutes === 60 ? 'In 1 hour' : `In 1 hour ${minutes - 60} minutes`;
  if (minutes < 1440) return `In ${Math.round(minutes / 60)} hours`;
  if (minutes < 2880) return 'Tomorrow';
  return `In ${Math.round(minutes / 1440)} days`;
}

function line(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/** Every notice due between `now` and `until`, soonest first. */
export function noticesBetween(sources: Sources): Notice[] {
  const { settings, now, until } = sources;
  const time = sources.time ?? defaultTime;
  // Timed notices keep what they need to be worded again if quiet hours move them.
  const raw: (Notice & { starts?: Date; extra?: (string | undefined)[] })[] = [];

  // `starts` is when the thing itself begins; the body is worded for when the notice arrives.
  const word = (at: Date, starts: Date, extra: (string | undefined)[]) => {
    const lead = Math.round((starts.getTime() - at.getTime()) / 60_000);
    return line(ahead(lead) ?? `At ${time(starts)}`, lead > 0 ? time(starts) : undefined, ...extra);
  };
  const timed = (
    key: string,
    kind: NoticeKind,
    at: Date,
    starts: Date,
    title: string,
    extra: (string | undefined)[],
    open: string,
  ) => {
    raw.push({ key, kind, at, title, body: word(at, starts, extra), open, starts, extra });
  };

  if (settings.items) {
    for (const item of sources.items) {
      if ((item.status !== 'OPEN' && item.status !== 'WAITING') || !item.scheduledAt || item.checklist) continue;
      const starts = new Date(item.scheduledAt);
      for (const minutes of remindersOf(item)) {
        const at = new Date(starts.getTime() - minutes * 60_000);
        timed(
          `item:${item.id}:${minutes}:${item.scheduledAt}`,
          'item',
          at,
          starts,
          item.title,
          [item.location],
          `item:${item.id}`,
        );
      }
    }
  }

  if (settings.calendars) {
    const lead = normalizeLeadMinutes(settings.calendarLead, defaultNoticeSettings.calendarLead);
    for (const event of sources.events) {
      if (event.allDay) continue;
      const at = new Date(event.start.getTime() - lead * 60_000);
      timed(
        `calendar:${event.key}:${lead}`,
        'calendar',
        at,
        event.start,
        event.title,
        [event.location],
        `day:${toLocalDate(event.start)}`,
      );
    }
  }

  if (settings.schedule) {
    const lead = normalizeLeadMinutes(settings.scheduleLead, defaultNoticeSettings.scheduleLead);
    for (const block of sources.blocks) {
      const at = new Date(block.start.getTime() - lead * 60_000);
      const name = block.label ? `${block.patternName} · ${block.label}` : block.patternName;
      timed(
        `schedule:${block.patternId}:${block.start.toISOString()}`,
        'schedule',
        at,
        block.start,
        name,
        [`until ${time(block.end)}`],
        `day:${block.date}`,
      );
    }
  }

  if (settings.runs) {
    for (const run of sources.runs ?? []) timed(`run:${run.key}`, 'run', run.at, run.at, run.title, [run.place], 'askesis');
  }

  if (settings.checkBacks) {
    for (const item of sources.items) {
      if (item.status !== 'WAITING' || !item.checkBackAt) continue;
      const day = toLocalDate(new Date(item.checkBackAt));
      raw.push({
        key: `check-back:${item.id}:${day}`,
        kind: 'check-back',
        at: atTime(day, MORNING),
        title: item.title,
        body: 'The day you chose to check back on this.',
        open: `item:${item.id}`,
      });
    }
  }

  if (settings.lookBacks) {
    for (const decision of sources.decisions) {
      if (!decision.revisitAt || decision.revisitedAt) continue;
      const day = toLocalDate(new Date(decision.revisitAt));
      raw.push({
        key: `look-back:${decision.id}:${day}`,
        kind: 'look-back',
        at: atTime(day, MORNING),
        title: decision.question,
        body: 'The day you chose to look back on this decision.',
        open: 'reflect',
      });
    }
  }

  if (settings.day) {
    for (let day = toLocalDate(now); atTime(day, '00:00') < until; day = addDays(day, 1)) {
      const at = atTime(day, settings.dayAt);
      const dayEnd = atTime(addDays(day, 1), '00:00');
      const things = [
        ...sources.blocks
          .filter((block) => block.date === day)
          .map((block) => ({ at: block.start, name: block.label ?? block.patternName })),
        ...sources.items
          .filter((item) => item.status === 'OPEN' && item.scheduledAt && !item.checklist)
          .map((item) => ({ at: new Date(item.scheduledAt!), name: item.title }))
          .filter((thing) => thing.at >= at && thing.at < dayEnd),
        ...(settings.calendars ? sources.events : [])
          .filter((event) => !event.allDay && event.start >= at && event.start < dayEnd)
          .map((event) => ({ at: event.start, name: event.title })),
      ].sort((a, b) => a.at.getTime() - b.at.getTime());
      const shown = things.slice(0, 3).map((thing) => `${thing.name} ${time(thing.at)}`);
      const more = things.length - shown.length;
      raw.push({
        key: `day:${day}`,
        kind: 'day',
        at,
        title: 'Your day',
        body: things.length
          ? `${shown.join(' · ')}${more > 0 ? ` · and ${more} more` : ''}`
          : 'Nothing with a time today.',
        open: 'today',
      });
    }
  }

  if (settings.bell) {
    for (let day = toLocalDate(now); atTime(day, '00:00') < until; day = addDays(day, 1)) {
      for (const when of settings.bellAt) {
        raw.push({
          key: `bell:${day}:${when}`,
          kind: 'bell',
          at: atTime(day, when),
          title: 'A moment',
          body: 'Where is your attention?',
          open: 'today',
        });
      }
    }
  }

  // Quiet hours and protected time hold a notice until they end; the wording follows.
  const held = raw.map(({ starts, extra, ...notice }) => {
    if (!sources.quiet) return notice;
    const at = deliverAt(notice.at, sources.quiet, sources.holding ?? sources.blocks);
    if (at.getTime() === notice.at.getTime()) return notice;
    return { ...notice, at, body: starts ? word(at, starts, extra ?? []) : notice.body };
  });
  return held
    .filter((notice) => notice.at > now && notice.at <= until)
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key));
}

/** What the lock screen shows when the person keeps details private. */
export function privateNotice(notice: Notice, time: (date: Date) => string = defaultTime): Notice {
  return { ...notice, title: 'Proairetos', body: `Something you chose, at ${time(notice.at)}.` };
}
