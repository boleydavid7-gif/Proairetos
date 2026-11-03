import { describe, expect, it } from 'vitest';
import type { LifeRecord } from '../../core/life-records';
import {
  groupLifeRecords,
  matchesLifeRecordQuery,
  mergeLibraryValueConnections,
  normalizeLibraryQuery,
  relatedLifeRecords,
} from '../../core/life-records/library';

function entry(overrides: Partial<LifeRecord> & Pick<LifeRecord, 'key' | 'title' | 'at'>): LifeRecord {
  return {
    kind: 'note',
    sourceApp: 'mneme',
    source: 'Mneme',
    sourceId: overrides.key,
    searchText: `${overrides.title} mneme`.toLocaleLowerCase(),
    valueIds: [],
    archived: false,
    ...overrides,
  };
}

describe('Reflect Library organization helpers', () => {
  it('matches all search terms regardless of order and ignores accents', () => {
    const record = entry({
      key: 'trip-1',
      title: 'A quiet evening in São Paulo',
      searchText: 'a quiet evening in são paulo poreia travel journal',
      at: '2026-11-15T12:00:00.000Z',
    });

    expect(normalizeLibraryQuery('PAULO quiet')).toEqual(['paulo', 'quiet']);
    expect(matchesLifeRecordQuery(record, 'paulo quiet')).toBe(true);
    expect(matchesLifeRecordQuery(record, 'quiet absent')).toBe(false);
    expect(matchesLifeRecordQuery(record, '   ')).toBe(true);
  });

  it('adds Library-owned value links without mutating source records', () => {
    const source = entry({
      key: 'note-1',
      title: 'A note',
      at: '2026-11-15T12:00:00.000Z',
      valueIds: ['growth'],
    });
    const [linked] = mergeLibraryValueConnections([source], [
      { id: 'note-1', valueIds: ['family', 'growth'] },
    ]);

    expect(linked.valueIds).toEqual(['growth', 'family']);
    expect(source.valueIds).toEqual(['growth']);
  });

  it('finds the newest records sharing one or more chosen values', () => {
    const current = entry({
      key: 'current',
      title: 'Current',
      at: '2026-11-15T12:00:00.000Z',
      valueIds: ['family'],
    });
    const older = entry({
      key: 'older',
      title: 'Older',
      at: '2026-10-01T12:00:00.000Z',
      valueIds: ['family'],
    });
    const newer = entry({
      key: 'newer',
      title: 'Newer',
      at: '2026-11-01T12:00:00.000Z',
      valueIds: ['family', 'growth'],
    });
    const unrelated = entry({
      key: 'unrelated',
      title: 'Unrelated',
      at: '2026-11-14T12:00:00.000Z',
      valueIds: ['health'],
    });

    expect(relatedLifeRecords(current, [current, older, newer, unrelated]).map((item) => item.key)).toEqual(['newer', 'older']);
    expect(relatedLifeRecords(unrelated, [current, older, newer, unrelated])).toEqual([]);
  });

  it('groups an already ordered timeline by month or source without reordering entries', () => {
    const november = entry({ key: 'nov', title: 'November', at: '2026-11-15T12:00:00.000Z' });
    const october = entry({ key: 'oct', title: 'October', at: '2026-10-15T12:00:00.000Z' });
    const travel = entry({
      key: 'travel',
      title: 'Trip',
      at: '2026-10-10T12:00:00.000Z',
      sourceApp: 'poreia',
      source: 'Poreia',
    });

    const months = groupLifeRecords([november, october, travel], 'month');
    expect(months).toHaveLength(2);
    expect(months[0].records.map((item) => item.key)).toEqual(['nov']);
    expect(months[1].records.map((item) => item.key)).toEqual(['oct', 'travel']);

    const sources = groupLifeRecords([november, october, travel], 'source');
    expect(sources.map((group) => group.label)).toEqual(['Mneme', 'Poreia']);
    expect(sources[0].records.map((item) => item.key)).toEqual(['nov', 'oct']);
    expect(groupLifeRecords([november, october], 'none')[0].records).toHaveLength(2);
  });
});
