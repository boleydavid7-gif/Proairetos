import type { LifeRecord } from './contract';

export type LifeRecordGroupBy = 'month' | 'source' | 'none';

export interface LifeRecordGroup {
  key: string;
  label: string;
  records: LifeRecord[];
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
