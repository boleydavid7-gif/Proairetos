import { describe, expect, it } from 'vitest';
import { buildLifeRecords } from '../../core/life-records';

describe('Life Record projection', () => {
  it('brings personal and companion-app records into one searchable chronology', () => {
    const records = buildLifeRecords({
      reflections: [{
        id: 'r1', userId: 'u', body: 'A thought about learning guitar.', kind: 'FREE',
        createdAt: '2026-11-01T20:00:00.000Z', promptKey: 'free-write', valueIds: ['growth'],
      }],
      decisions: [{
        id: 'd1', userId: 'u', question: 'Which course should I take?', options: ['A', 'B'],
        choice: 'B', decidedAt: '2026-11-01T18:00:00.000Z', reasons: 'It fits my schedule.',
      }],
      workouts: [{
        id: 'w1', date: '2026-11-01', activity: 'run', createdAt: '2026-11-01T07:00:00.000Z',
        meters: 5000, seconds: 1800, notes: 'Felt good by the end.',
      }],
      recipes: [{
        id: 'meal1', title: 'Roasted chicken', notes: 'A family dinner.',
        ingredients: ['chicken', 'potatoes'], tags: ['weeknight'],
        cookedFor: { '2026-10-31': ['Sam', 'Alex'] },
      }],
      studySessions: [{
        id: 's1', itemId: 'book1', title: 'Thinking in Systems', minutes: 25,
        at: '2026-10-31T19:00:00.000Z', kind: 'reading',
      }],
    });

    expect(new Set(records.map((entry) => entry.kind))).toEqual(new Set(['reflection', 'decision', 'workout', 'meal', 'study']));
    expect(records.every((entry, index) => index === 0 || records[index - 1].at >= entry.at)).toBe(true);
    expect(records.find((entry) => entry.key === 'workout:w1')).toMatchObject({
      source: 'Askesis',
      title: 'Run',
      searchText: expect.stringContaining('felt good by the end'),
    });
    expect(records.find((entry) => entry.key === 'meal:meal1@2026-10-31')).toMatchObject({
      source: 'Soma',
      title: 'Roasted chicken',
      detail: 'Cooked for Sam and Alex',
      searchText: expect.stringContaining('potatoes'),
    });
    expect(records.find((entry) => entry.key === 'study:s1')).toMatchObject({
      source: 'Theoria',
      detail: '25 min · Reading',
      searchText: expect.stringContaining('reading'),
    });
  });

  it('retains the originating companion app for reflections written there', () => {
    const records = buildLifeRecords({
      reflections: [
        { id: 'run-note', userId: 'u', body: 'A note after running.', kind: 'FREE', createdAt: '2026-11-02T08:00:00.000Z', promptKey: 'after-run' },
        { id: 'trip-note', userId: 'u', body: 'A note after the trip.', kind: 'FREE', createdAt: '2026-11-02T09:00:00.000Z', promptKey: 'after-trip' },
      ],
    });
    expect(records.find((entry) => entry.key === 'reflection:run-note')?.source).toBe('Askesis');
    expect(records.find((entry) => entry.key === 'reflection:trip-note')?.source).toBe('Poreia');
  });

  it('includes Dynamis strength sessions with searchable sets and source identity', () => {
    const [record] = buildLifeRecords({
      strengthUnit: 'lb',
      strengthWorkouts: [{
        id: 'lift1',
        date: '2026-11-02',
        session: 'A',
        createdAt: '2026-11-02T17:30:00.000Z',
        minutes: 42,
        felt: 'good',
        note: 'More stable form today.',
        exercises: [
          { exercise: 'bench-press', name: 'Bench press', sets: [{ weight: 95, reps: 8 }, { weight: 95, reps: 7 }] },
          { exercise: 'row', name: 'Dumbbell row', sets: [{ weight: 35, reps: 10 }] },
        ],
      }],
    });

    expect(record).toMatchObject({
      key: 'dynamis-workout:lift1',
      kind: 'workout',
      source: 'Dynamis',
      sourceId: 'lift1',
      title: 'Bench press, Dumbbell row',
      detail: '3 sets · 42 min · Felt good',
    });
    expect(record.body).toContain('Bench press: 95 lb × 8, 95 lb × 7');
    expect(record.body).toContain('More stable form today.');
    expect(record.searchText).toContain('bench-press');
    expect(record.searchText).toContain('95');
  });

  it('keeps archived records marked and preserves the source identity', () => {
    const source = {
      id: 'r2', userId: 'u', body: 'Keep the original.', kind: 'FREE' as const,
      createdAt: '2026-11-02T12:00:00.000Z', archivedAt: '2026-11-03T12:00:00.000Z',
    };
    const [record] = buildLifeRecords({ reflections: [source] });
    expect(record).toMatchObject({
      key: 'reflection:r2',
      sourceId: 'r2',
      archived: true,
      body: 'Keep the original.',
    });
    expect(source.body).toBe('Keep the original.');
  });
});
