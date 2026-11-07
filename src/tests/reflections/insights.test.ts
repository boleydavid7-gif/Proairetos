import { describe, expect, it } from 'vitest';
import type { LifeItem } from '../../core/life-items/types';
import { gatherInsights, insightRange, timeOfDay } from '../../core/reflections/insights';
import type { Reflection } from '../../core/reflections/types';

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();
const reflection = (fields: Partial<Reflection>): Reflection => ({ id: Math.random().toString(), userId: 'u', body: 'x', kind: 'FREE', createdAt: at(1, 9), ...fields });
const item = (fields: Partial<LifeItem>): LifeItem => ({
  id: Math.random().toString(),
  userId: 'u',
  type: null,
  title: 'x',
  status: 'OPEN',
  important: false,
  source: 'CAPTURE',
  carried: false,
  createdAt: at(1, 9),
  updatedAt: at(1, 9),
  ...fields,
});

describe('insights', () => {
  const range = insightRange('week', new Date(2026, 9, 1, 12));

  it('counts the weather the person picked, and leaves the rest unmarked', () => {
    const result = gatherInsights(range, [], [
      reflection({ weather: 'CLEAR' }),
      reflection({ weather: 'RAIN' }),
      reflection({ weather: 'RAIN' }),
      reflection({}),
      reflection({ kind: 'INTENTION', weather: 'STORM' }),
      reflection({ weather: 'STORM', createdAt: at(20, 9) }),
    ], []);
    expect(result.weather).toEqual({ counts: { CLEAR: 1, PARTLY: 0, CLOUDY: 0, RAIN: 2, STORM: 0 }, unmarked: 1 });
    expect(result.reflections).toBe(4);
  });

  it('counts captures by kind and entries by time of day', () => {
    const result = gatherInsights(
      range,
      [item({ captureKind: 'EMOTION' }), item({ captureKind: 'IDEA' }), item({})],
      [reflection({ createdAt: at(1, 7) }), reflection({ createdAt: at(1, 23) })],
      [],
    );
    expect(result.captured).toEqual({ counts: { TODO: 0, REMEMBER: 0, CONCERN: 0, IDEA: 1, FEELING: 1 }, untagged: 1 });
    expect(result.writtenAt).toEqual({ MORNING: 1, AFTERNOON: 0, EVENING: 0, NIGHT: 1 });
  });

  it('lists only values that were used', () => {
    const values = [
      { id: 'v1', userId: 'u', name: 'Patience', source: 'PRESET' as const, chosenAt: at(1, 1) },
      { id: 'v2', userId: 'u', name: 'Courage', source: 'PRESET' as const, chosenAt: at(1, 1) },
    ];
    const result = gatherInsights(range, [item({ valueIds: ['v1'] })], [reflection({ valueIds: ['v1'] })], values);
    expect(result.values).toEqual([{ name: 'Patience', entries: 1, items: 1, done: 0 }]);
  });

  it('places the clock into four parts of the day', () => {
    expect([5, 12, 17, 22, 2].map((h) => timeOfDay(at(1, h)))).toEqual(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'NIGHT']);
  });
});

describe('insights and Plan tasks', () => {
  it('counts only what came through Capture as captured', () => {
    const range = insightRange('week', new Date(2026, 9, 1, 12));
    const result = gatherInsights(range, [item({ source: 'MANUAL', type: 'DO' }), item({ captureKind: 'IDEA' })], [], []);
    expect(result.captured).toEqual({ counts: { TODO: 0, REMEMBER: 0, CONCERN: 0, IDEA: 1, FEELING: 0 }, untagged: 0 });
  });
});

describe('done by the clock, values, and side by side', () => {
  const ev = (kind: 'COMPLETED' | 'LET_GO' | 'FOCUSED', itemId: string, timestamp: string, minutes?: number) => ({
    id: `${kind}-${itemId}-${timestamp}`, itemId, kind, timestamp, ...(minutes ? { metadata: { minutes } } : {}),
  });
  const thing = (id: string, valueIds?: string[]) => ({
    id, userId: 'u', type: 'DO' as const, title: id, status: 'DONE' as const, important: false, source: 'CAPTURE' as const, carried: false,
    createdAt: '2026-09-20T10:00:00', updatedAt: '2026-09-20T10:00:00', ...(valueIds ? { valueIds } : {}),
  });

  it('counts when things were marked done and which values they were linked to', async () => {
    const { gatherInsights, insightRange } = await import('../../core/reflections/insights');
    const range = insightRange('week', new Date('2026-10-01T12:00:00'));
    const result = gatherInsights(
      range,
      [thing('a', ['v']), thing('b')],
      [],
      [{ id: 'v', userId: 'u', name: 'Courage', source: 'PRESET' as const, chosenAt: '' }],
      [ev('COMPLETED', 'a', '2026-09-30T08:00:00'), ev('COMPLETED', 'b', '2026-09-30T19:00:00'), ev('COMPLETED', 'b', '2026-09-20T19:00:00')],
    );
    expect(result.doneAt).toEqual({ MORNING: 1, AFTERNOON: 0, EVENING: 1, NIGHT: 0 });
    expect(result.values).toEqual([{ name: 'Courage', entries: 0, items: 0, done: 1 }]);
  });

  it('puts this week beside last week as plain counts', async () => {
    const { previousRange, insightRange, sideBySide } = await import('../../core/reflections/insights');
    const now = new Date('2026-10-01T12:00:00');
    const before = previousRange('week', now)!;
    expect(before.start.getDate()).toBe(21);
    expect(previousRange('all', now)).toBeUndefined();
    const rows = sideBySide(
      insightRange('week', now),
      before,
      [thing('a'), { ...thing('c'), createdAt: '2026-09-30T09:00:00' }],
      [ev('COMPLETED', 'a', '2026-09-30T08:00:00'), ev('LET_GO', 'b', '2026-09-24T08:00:00'), ev('FOCUSED', 'a', '2026-09-29T08:00:00', 25)],
      [],
    );
    expect(rows).toEqual([
      { label: 'Captured', now: 1, before: 0 },
      { label: 'Done', now: 1, before: 0 },
      { label: 'Let go', now: 0, before: 1 },
      { label: 'Focused minutes', now: 25, before: 0 },
      { label: 'Reflections', now: 0, before: 0 },
    ]);
  });
});
