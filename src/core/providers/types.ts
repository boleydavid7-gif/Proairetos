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

export type CalendarLine = { ref: RecordRef; day: string; time?: string; title: string; open: string };
export type HomeRow = { ref: RecordRef; group: 'practice' | 'attention'; title: string; line?: string; open: string; action?: 'done' | 'skip' };

export type OutputOf<C extends Capability> = C extends 'search'
  ? SearchProjection[]
  : C extends 'calendar'
    ? CalendarLine[]
    : C extends 'home'
      ? HomeRow[]
      : unknown[];

/** What a provider may read: its own records, through the device's stores. */
export type ProviderContext = {
  /** The person's local date, `YYYY-MM-DD`. */
  today: string;
  now: Date;
  /** Records of a synced collection (`oikonomiaBills`) on this device. */
  records<T>(source: string): Promise<T[]>;
  /** A stored setting of the same app. */
  setting(key: string): string | null;
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
};
