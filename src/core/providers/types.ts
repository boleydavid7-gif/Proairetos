import type { AppId, Capability, PrivacyClass } from '../apps/manifest';

export type { Capability, PrivacyClass };

/*
 * The provider contract (docs/PROVIDER_CONTRACT.md, docs/PHASE3_PLAN.md). A provider is a pure function from an app's
 * records, already on this device through encrypted sync, to a small view for Proairetos. It never writes, never
 * calls the network and never receives another app's records. Views are derived on the device and not stored.
 * Only `search` is implemented so far; the other outputs are declared so the shape is settled.
 */

/** A stable address for a record: `app:kind:id[:occurrence]`, the same as `lifeRecordKey`. Never from editable text. */
export type RecordRef = { app: AppId; kind: string; id: string; occurrence?: string };

export const refKey = (ref: RecordRef): string =>
  `${ref.app}:${ref.kind}:${encodeURIComponent(ref.id)}${ref.occurrence === undefined ? '' : `:${encodeURIComponent(ref.occurrence)}`}`;

export type SearchProjection = {
  ref: RecordRef;
  /** What the result is called, and the manifest field name it comes from (`search.indexes`). */
  title: string;
  titleField: string;
  /** Text that can match, each under a manifest field name. */
  fields: { name: string; text: string }[];
  /** When it happened or was last touched (ISO date or date-time); a window is measured from it. */
  at: string;
  /** What the row says it is ("Bill in Oikonomia"). */
  label: string;
  /** Where it opens, inside the owning app. */
  open: string;
};

/**
 * What a line on the calendar is, so that not every record looks like an appointment: an `event` has a time and a place on
 * the clock, a `deadline` is a day something is due or ends, `recurring` is a date that comes round (a birthday, a bill
 * that repeats) and `info` is a span of days that only gives context (a trip).
 */
export type CalendarKind = 'event' | 'deadline' | 'recurring' | 'info';

/**
 * One line an app puts on the calendar. A line points at a record the app keeps and owns; it is never the record, and
 * nothing here can carry a note, an amount, a code or a detail the manifest does not list. Days are the person's local
 * calendar days (`YYYY-MM-DD`), so a date with no time stays that day in every time zone.
 */
export type CalendarLine = {
  /** `occurrence` is the day, for a date that comes round, so each coming is its own line. */
  ref: RecordRef;
  kind: CalendarKind;
  title: string;
  detail?: string;
  /** Inside the owning app: its own address, with `?open=` for a record. */
  open: string;
  /** The day it falls on: the first day of a span, the day a timed line starts. */
  day: string;
  /** A span of days only: the day after its last day (end-exclusive). */
  until?: string;
  /** A timed `event` only. */
  start?: Date;
  end?: Date;
  location?: string;
  /** A deadline that is met (a bill with its payment recorded). */
  done?: boolean;
  color?: 'amber' | 'violet' | 'sage' | 'sky' | 'rose' | 'slate';
};

/**
 * One line an app puts on Today. It is a summary and a way in, never the record: a title and a detail in words, where
 * tapping goes (inside the owning app), and at most a progress bar, a glyph and what a pull does. Nothing else can ride on it.
 */
export type HomeRow = {
  ref: RecordRef;
  /** Which of Today's two app groups it belongs to; the manifest says the same (`today.group`). */
  group: 'practice' | 'attention';
  /** An attention row has a title; a practice row is one line, its detail. */
  title?: string;
  detail: string;
  /** Inside the owning app: its own address, with `?open=` for a record. */
  open: string;
  /** A glyph other than the app's own mark (bills, people and trips have their own). */
  icon?: 'list' | 'person' | 'suitcase';
  progress?: { value: number; label: string };
  /**
   * Pulls on the row. `id` is what "Not today" remembers; `marks` says a pull to the left marks the thing in its own app
   * (the provider's `act`) and `word` is what that is called; otherwise it is only done here for the day.
   */
  swipe?: { id: string; word?: string; marks?: boolean; label?: string };
  /** The What's included part that "Not for me" sets aside. */
  notForMe?: string;
};

/**
 * One notice an app puts forward: when it is shown and the words it says. It is the same moment the app's own notice
 * function gives today, with the same key (which is also the notification's tag and the server row's identity), and it
 * carries nothing else: no note, amount, code, address, reading or other field the manifest does not list.
 */
export type NoticeLine = {
  /** The record or day it is about. For audit and duplicate checks; never shown. */
  ref: RecordRef;
  /** One of the app's manifest `notices.kinds`. */
  kind: string;
  /** Stable for this reminder at this time. */
  key: string;
  at: Date;
  title: string;
  body: string;
  /** Where a tap opens, in the form notices use (`app:record` or the app's bare name), which `placeFor` resolves to a page inside the owning app. */
  open: string;
};

export type OutputOf<C extends Capability> = C extends 'search'
  ? SearchProjection[]
  : C extends 'calendar'
    ? CalendarLine[]
    : C extends 'home'
      ? HomeRow[]
      : C extends 'notices'
        ? NoticeLine[]
        : unknown[];

/**
 * A stretch of the person's committed or protected time, for a notice that follows the day (sleep, waking, work days).
 * Only when it starts and ends and what kind it is. `label` is the name of a shift in the person's own schedule and is never
 * set for an event from another calendar, whose title and details do not reach a provider.
 */
export type NoticeBlock = { start: Date; end: Date; kind: import('../scheduling/types').ScheduleKind; label?: string };

/** What a provider may read: its own records, through the device's stores. */
export type ProviderContext = {
  /** The person's local date, `YYYY-MM-DD`. */
  today: string;
  now: Date;
  /** Records of a synced collection (`oikonomiaBills`) on this device. */
  records<T>(source: string): Promise<T[]>;
  /** A stored setting of the same app. */
  setting(key: string): string | null;
  /** Home: the person's schedule between two times (Proairetos's own), for a night shift's day, work days and sleep. */
  schedule?(from: Date, until: Date): Promise<import('../scheduling/types').ScheduleOccurrence[]>;
  /** Home: the person's day that Today is showing, from when it starts to when the next begins (a night shift carries a day past midnight). */
  day?: { start: Date; end: Date };
  /** Home: where the person's day starts and whether a shift carries it. */
  daySettings?(): import('../rhythm/personalDay').DaySettings;
  /** Calendar: the visible range, `until` exclusive. A provider expands repeats only inside it. */
  range?: { from: Date; until: Date };
  /** Notices: the person's schedule and counting calendars between two times, as `NoticeBlock`s. */
  blocks?(from: Date, until: Date): Promise<NoticeBlock[]>;
};

export type Provider<C extends Capability = Capability> = {
  app: AppId;
  capability: C;
  /** Bump when what it returns means something different. */
  version: number;
  /** The class of everything it returns. */
  privacy: PrivacyClass;
  /** Synced collections it reads, and settings as `setting:<key>`. A test holds each to what syncs. */
  sources: readonly string[];
  read(ctx: ProviderContext): Promise<OutputOf<C>> | OutputOf<C>;
  /** Called when its own app's records change on this device, so a cached result is dropped. */
  subscribe?(listener: () => void): () => void;
  /** Home only: marks the row's thing in its own app, and gives back how to take the mark off. Runs on a pull, never on a read. */
  act?(ref: RecordRef, today: string): () => void;
  /** Home only: starts what a row needs to be current (a forecast, a worked-out week). Called when Home starts, on sync and on coming back into view. */
  warm?(ctx: ProviderContext): void;
  /** How long a result is kept before it is derived again, when sooner than the usual five minutes (Poreia's next thing moves by the minute). */
  maxAgeMs?: number;
};
