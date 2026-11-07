import type { LifeRecord } from './contract';

export type LifeRecordGroupBy = 'month' | 'source' | 'none';

export interface LifeRecordYearGroup {
  key: string;
  label: string;
  records: LifeRecord[];
  months: LifeRecordGroup[];
}

/** A Reflect Trash item expires after the configured retention period. */
export function isLibraryTrashExpired(
  trashedAt: string,
  now = Date.now(),
  retentionDays = 30,
): boolean {
  const timestamp = new Date(trashedAt).getTime();
  return Number.isFinite(timestamp) && now - timestamp >= retentionDays * 86_400_000;
}

/** Only records with a safe, matching archive operation can be bulk archived or restored. */
export function canArchiveLifeRecord(record: LifeRecord): boolean {
  return record.kind === 'reflection'
    || record.kind === 'decision'
    || record.kind === 'pursuit'
    || record.kind === 'life'
    || (record.kind === 'note' && record.sourceApp === 'mneme');
}

export interface LifeRecordGroup {
  key: string;
  label: string;
  records: LifeRecord[];
}

/**
 * Build a Year → Month hierarchy from an already-sorted result set.
 * Month and year counts remain accurate even when the UI only renders the first page.
 */
export function groupLifeRecordsByYear(records: readonly LifeRecord[]): LifeRecordYearGroup[] {
  const years = new Map<string, LifeRecordYearGroup>();

  for (const record of records) {
    const date = new Date(record.at);
    const validDate = Number.isFinite(date.getTime());
    const yearKey = validDate ? String(date.getFullYear()) : 'unknown-date';
    const yearLabel = validDate ? yearKey : 'Date unavailable';
    const monthKey = validDate
      ? `${yearKey}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'unknown-date';
    const monthLabel = validDate
      ? date.toLocaleDateString(undefined, { month: 'long' })
      : 'Date unavailable';

    let year = years.get(yearKey);
    if (!year) {
      year = { key: yearKey, label: yearLabel, records: [], months: [] };
      years.set(yearKey, year);
    }
    year.records.push(record);

    let month = year.months.find((group) => group.key === monthKey);
    if (!month) {
      month = { key: monthKey, label: monthLabel, records: [] };
      year.months.push(month);
    }
    month.records.push(record);
  }

  return [...years.values()];
}

/** Accent-insensitive, all-terms search. Word order no longer matters. */
export function normalizeLibraryQuery(query: string): string[] {
  return query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesLifeRecordQuery(record: LifeRecord, query: string): boolean {
  const terms = normalizeLibraryQuery(query);
  if (!terms.length) return true;
  const haystack = record.searchText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** Add Library-owned value links without mutating companion-app source records. */
export function mergeLibraryValueConnections(
  records: readonly LifeRecord[],
  connections: readonly { id: string; valueIds: readonly string[] }[],
): LifeRecord[] {
  const byRecord = new Map(connections.map((connection) => [connection.id, connection.valueIds]));
  return records.map((record) => ({
    ...record,
    valueIds: [...new Set([...record.valueIds, ...(byRecord.get(record.key) ?? [])])],
  }));
}

/** Find other entries that share at least one deliberately chosen value. */
export function relatedLifeRecords(
  record: LifeRecord,
  records: readonly LifeRecord[],
  limit = 3,
): LifeRecord[] {
  if (!record.valueIds.length || limit <= 0) return [];
  const ownValues = new Set(record.valueIds);
  return records
    .filter((candidate) => candidate.key !== record.key && candidate.valueIds.some((id) => ownValues.has(id)))
    .sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** Group an already-sorted result set while preserving its order within each group. */
export function groupLifeRecords(
  records: readonly LifeRecord[],
  groupBy: LifeRecordGroupBy,
): LifeRecordGroup[] {
  if (!records.length) return [];
  if (groupBy === 'none') return [{ key: 'all', label: 'All entries', records: [...records] }];

  const groups = new Map<string, LifeRecordGroup>();
  for (const record of records) {
    let key: string;
    let label: string;
    if (groupBy === 'source') {
      key = record.sourceApp;
      label = record.source;
    } else {
      const date = new Date(record.at);
      if (!Number.isFinite(date.getTime())) {
        key = 'unknown-date';
        label = 'Date unavailable';
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
    }
    const group = groups.get(key);
    if (group) group.records.push(record);
    else groups.set(key, { key, label, records: [record] });
  }
  return [...groups.values()];
}
