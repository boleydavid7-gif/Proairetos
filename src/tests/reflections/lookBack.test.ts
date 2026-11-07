import { describe, expect, it } from 'vitest';
import { onThisDay, yearInWords, yearsWithWords, yearIsEmpty } from '../../core/reflections/lookBack';
import type { Reflection } from '../../core/reflections/types';

const entry = (id: string, at: string, body: string, over: Partial<Reflection> = {}): Reflection => ({
  id,
  userId: 'u',
  body,
  kind: 'FREE',
  createdAt: new Date(at).toISOString(),
  ...over,
});

describe('on this day', () => {
  const all = [
    entry('a', '2025-10-09T10:00:00', 'A year ago'),
    entry('b', '2024-10-09T10:00:00', 'Two years ago'),
    entry('c', '2025-10-10T10:00:00', 'Another day'),
    entry('d', '2026-10-09T08:00:00', 'Today, not earlier'),
    entry('e', '2025-10-09T09:00:00', 'My intention', { kind: 'INTENTION' }),
    entry('f', '2023-10-09T10:00:00', '   '),
  ];

  it('finds the same day in earlier years, nearest first, and nothing else', () => {
    const found = onThisDay(all, '2026-10-09');
    expect(found.map((f) => [f.reflection.id, f.yearsAgo])).toEqual([['a', 1], ['b', 2]]);
  });

  it('is nothing when nothing was written then', () => {
    expect(onThisDay(all, '2026-03-01')).toEqual([]);
  });
});

describe('a year in your words', () => {
  const data = {
    reflections: [
      entry('1', '2025-02-01T10:00:00', 'Warm tea', { promptKey: 'gratitude' }),
      entry('2', '2025-02-02T10:00:00', 'A walk\nA call\nA nap', { promptKey: 'three-good-things' }),
      entry('3', '2025-03-01T10:00:00', 'Free writing'),
      entry('4', '2024-03-01T10:00:00', 'Last year'),
    ],
    decisions: [{ id: 'd', userId: 'u', question: 'Move?', options: [], choice: 'Stay', decidedAt: new Date('2025-05-01T10:00:00').toISOString() }],
    statements: [{ id: 's', userId: 'u', type: 'GOAL' as const, body: 'Run 5K', createdAt: '2025-01-01T00:00:00Z', reachedAt: new Date('2025-09-01T10:00:00').toISOString() }],
    values: [{ id: 'v', userId: 'u', name: 'Courage', source: 'PRESET' as const, chosenAt: new Date('2025-01-05T10:00:00').toISOString() }],
  };

  it('gathers one year, oldest first, in the person’s own words', () => {
    const year = yearInWords(data, 2025);
    expect(year.grateful.map((l) => l.text)).toEqual(['Warm tea']);
    expect(year.goodThings[0].text).toContain('A walk');
    expect(year.reflections.map((l) => l.text)).toEqual(['Free writing']);
    expect(year.decisions[0]).toMatchObject({ question: 'Move?', choice: 'Stay' });
    expect(year.goalsReached[0]).toMatchObject({ text: 'Run 5K', day: '2025-09-01' });
    expect(year.valuesChosen).toEqual(['Courage']);
  });

  it('lists the years that have writing, newest first, and knows an empty year', () => {
    expect(yearsWithWords(data.reflections)).toEqual([2025, 2024]);
    expect(yearIsEmpty(yearInWords(data, 2020))).toBe(true);
  });
});
