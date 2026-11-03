/**
 * Stable integration contract for the Reflect / Life Record library.
 *
 * Companion apps keep ownership of their own records. An adapter only projects
 * selected records into this read-only shape; it must never mutate source data.
 */
export type LifeRecordApp =
  | 'proairetos'
  | 'compass'
  | 'askesis'
  | 'dynamis'
  | 'soma'
  | 'theoria'
  | 'poreia'
  | 'hydros'
  | 'oikonomia'
  | 'mneme';

export type LifeRecordSource =
  | 'Proairetos'
  | 'Compass'
  | 'Askesis'
  | 'Dynamis'
  | 'Soma'
  | 'Theoria'
  | 'Poreia'
  | 'Hydros'
  | 'Oikonomia'
  | 'Mneme';

export type LifeRecordKind =
  | 'reflection'
  | 'decision'
  | 'pursuit'
  | 'life'
  | 'workout'
  | 'meal'
  | 'study'
  | 'note'
  | 'idea'
  | 'hydration'
  | 'trip'
  | 'financial';

export interface LifeRecord {
  /** Stable, unique key for this projected entry. Do not derive it from editable text. */
  key: string;
  /** The type of experience, not the app it came from. */
  kind: LifeRecordKind;
  /** Stable app identifier used by integrations and navigation. */
  sourceApp: LifeRecordApp;
  /** Human-readable source label. */
  source: LifeRecordSource;
  /** Stable identifier of the authoritative source record. */
  sourceId: string;
  /** ISO-8601 date-time representing when the event happened. */
  at: string;
  title: string;
  detail?: string;
  body?: string;
  /** Lowercase, searchable text assembled from the visible content and source-specific terms. */
  searchText: string;
  valueIds: string[];
  archived: boolean;
}

export interface LifeRecordDraft extends Omit<LifeRecord, 'searchText'> {
  searchParts?: readonly (string | undefined)[];
}

/**
 * Every source integration implements this adapter.
 *
 * owner identifies the app that stores the authoritative data. sourceApp on an
 * individual record may identify a different originating app when, for
 * example, a Proairetos reflection was written from a companion-app prompt.
 */
export interface LifeRecordAdapter<TInput> {
  readonly id: string;
  readonly owner: LifeRecordApp;
  readonly kinds: readonly LifeRecordKind[];
  toRecords(input: TInput): readonly LifeRecord[];
}

/** Use this for new integrations. Existing keys are intentionally preserved for saved-item compatibility. */
export function lifeRecordKey(
  app: LifeRecordApp,
  kind: LifeRecordKind,
  sourceId: string,
  occurrenceId?: string,
): string {
  const source = encodeURIComponent(sourceId);
  const occurrence = occurrenceId === undefined ? '' : `:${encodeURIComponent(occurrenceId)}`;
  return `${app}:${kind}:${source}${occurrence}`;
}

/** The one canonical constructor keeps search indexing consistent across apps. */
export function createLifeRecord(draft: LifeRecordDraft): LifeRecord {
  const { searchParts = [], ...record } = draft;
  const searchText = [
    record.title,
    record.detail,
    record.body,
    record.source,
    ...searchParts,
  ]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();

  return { ...record, searchText };
}

/**
 * Contract check used by adapter tests. It catches incomplete projections
 * before an app integration is accepted; production source records remain
 * untouched if a projection is invalid.
 */
export function validateLifeRecordAdapter<TInput>(
  adapter: LifeRecordAdapter<TInput>,
  input: TInput,
): LifeRecord[] {
  const records = [...adapter.toRecords(input)];
  const keys = new Set<string>();

  for (const record of records) {
    if (!adapter.kinds.includes(record.kind)) {
      throw new Error(`Adapter ${adapter.id} emitted unsupported kind "${record.kind}".`);
    }
    if (!record.key.trim() || keys.has(record.key)) {
      throw new Error(`Adapter ${adapter.id} emitted a missing or duplicate record key.`);
    }
    if (!record.sourceId.trim()) {
      throw new Error(`Adapter ${adapter.id} emitted a record without a source ID.`);
    }
    if (!record.title.trim() || !record.source.trim()) {
      throw new Error(`Adapter ${adapter.id} emitted a record without a title or source label.`);
    }
    if (!Number.isFinite(new Date(record.at).getTime())) {
      throw new Error(`Adapter ${adapter.id} emitted an invalid event timestamp.`);
    }
    if (!record.searchText.includes(record.title.toLocaleLowerCase())) {
      throw new Error(`Adapter ${adapter.id} did not index its record title for search.`);
    }
    keys.add(record.key);
  }

  return records;
}
