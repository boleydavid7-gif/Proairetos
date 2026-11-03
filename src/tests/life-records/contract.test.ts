import { describe, expect, it } from 'vitest';
import {
  lifeRecordAdapters,
  lifeRecordKey,
  validateLifeRecordAdapter,
} from '../../core/life-records';

describe('Life Record integration contract', () => {
  it('validates the current Proairetos and companion-app adapters', () => {
    const records = [
      ...validateLifeRecordAdapter(lifeRecordAdapters.reflections, [{
        id: 'reflection-1',
        userId: 'user-1',
        body: 'A reflection from a run.',
        kind: 'FREE' as const,
        createdAt: '2026-11-02T08:00:00.000Z',
        promptKey: 'after-run',
      }]),
      ...validateLifeRecordAdapter(lifeRecordAdapters.decisions, {
        decisions: [{
          id: 'decision-1',
          userId: 'user-1',
          question: 'Which route?',
          options: ['A', 'B'],
          choice: 'A',
          decidedAt: '2026-11-02T09:00:00.000Z',
        }],
      }),
      ...validateLifeRecordAdapter(lifeRecordAdapters.pursuits, [{
        id: 'pursuit-1',
        title: 'Learn to cook',
        status: 'active' as const,
        createdAt: '2026-11-02T10:00:00.000Z',
        updatedAt: '2026-11-02T10:00:00.000Z',
      }]),
      ...validateLifeRecordAdapter(lifeRecordAdapters.lifeItems, [{
        id: 'life-1',
        userId: 'user-1',
        type: 'DO' as const,
        title: 'Schedule the appointment',
        status: 'OPEN' as const,
        important: false,
        source: 'MANUAL' as const,
        carried: false,
        createdAt: '2026-11-02T11:00:00.000Z',
        updatedAt: '2026-11-02T11:00:00.000Z',
      }]),
      ...validateLifeRecordAdapter(lifeRecordAdapters.askesis, {
        unit: 'mi',
        workouts: [{
          id: 'run-1',
          date: '2026-11-02',
          activity: 'run' as const,
          createdAt: '2026-11-02T12:00:00.000Z',
          meters: 5000,
          seconds: 1800,
          notes: 'Felt steady.',
        }],
      }),
      ...validateLifeRecordAdapter(lifeRecordAdapters.dynamis, {
        unit: 'lb',
        workouts: [{
          id: 'strength-1',
          date: '2026-11-02',
          session: 'A',
          createdAt: '2026-11-02T13:00:00.000Z',
          exercises: [{
            exercise: 'bench-press',
            name: 'Bench press',
            sets: [{ weight: 95, reps: 8 }],
          }],
        }],
      }),
      ...validateLifeRecordAdapter(lifeRecordAdapters.soma, [{
        id: 'recipe-1',
        title: 'Roasted chicken',
        cookedFor: { '2026-11-02': ['Family'] },
      }]),
      ...validateLifeRecordAdapter(lifeRecordAdapters.theoria, [{
        id: 'study-1',
        itemId: 'book-1',
        title: 'Thinking in Systems',
        minutes: 25,
        at: '2026-11-02T14:00:00.000Z',
        kind: 'reading' as const,
      }]),
    ];

    expect(records).toHaveLength(8);
    expect(new Set(records.map((record) => record.key)).size).toBe(records.length);
    expect(records.find((record) => record.key === 'reflection:reflection-1')?.sourceApp).toBe('askesis');
    expect(records.find((record) => record.key === 'dynamis-workout:strength-1')?.sourceApp).toBe('dynamis');
    expect(records.every((record) => record.searchText.includes(record.title.toLocaleLowerCase()))).toBe(true);
  });

  it('creates stable namespaced keys for new adapters and repeated source records', () => {
    expect(lifeRecordKey('hydros', 'hydration', 'day-1')).toBe('hydros:hydration:day-1');
    expect(lifeRecordKey('soma', 'meal', 'recipe-1', '2026-11-02')).toBe('soma:meal:recipe-1:2026-11-02');
    expect(lifeRecordKey('soma', 'meal', 'recipe-1', '2026-11-03')).not.toBe(
      lifeRecordKey('soma', 'meal', 'recipe-1', '2026-11-02'),
    );
  });

  it('rejects adapters that emit duplicate keys', () => {
    const record = {
      key: 'same-key',
      kind: 'note' as const,
      sourceApp: 'mneme' as const,
      source: 'Mneme' as const,
      sourceId: 'note-1',
      at: '2026-11-02T12:00:00.000Z',
      title: 'A note',
      searchText: 'a note mneme',
      valueIds: [],
      archived: false,
    };
    const adapter = {
      id: 'mneme.notes',
      owner: 'mneme' as const,
      kinds: ['note'] as const,
      toRecords: () => [record, record],
    };

    expect(() => validateLifeRecordAdapter(adapter, undefined)).toThrow(/duplicate record key/i);
  });
});
