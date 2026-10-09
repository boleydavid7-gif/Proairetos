import { describe, expect, it } from 'vitest';
import { readableExport } from '../../core/export/markdown';
import type { LifeItem } from '../../core/life-items/types';

const item = (over: Partial<LifeItem>): LifeItem =>
  ({
    id: 'i1',
    userId: 'u',
    type: 'TODO',
    title: 'Call the plumber',
    status: 'OPEN',
    important: false,
    source: 'CAPTURE',
    carried: false,
    createdAt: '2026-10-01T09:00:00',
    ...over,
  }) as LifeItem;

describe('readableExport', () => {
  const now = new Date(2026, 9, 9, 12);

  it('says so when nothing is written', () => {
    expect(readableExport({ lifeItems: [], reflections: [], values: [], statements: [], decisions: [] }, { now })).toContain(
      'Nothing has been written yet.',
    );
  });

  it('keeps the person’s words, newest reflection first, with the prompt it answered', () => {
    const text = readableExport(
      {
        lifeItems: [item({ notes: 'Ask about the tap\nand the boiler' })],
        reflections: [
          { id: 'a', userId: 'u', body: 'Older line', kind: 'FREE', createdAt: '2026-10-01T10:00:00' },
          { id: 'b', userId: 'u', body: 'Newer line\nsecond line', kind: 'FREE', createdAt: '2026-10-05T10:00:00', promptKey: 'gratitude', weather: 'CLEAR' },
        ],
        values: [{ id: 'v', userId: 'u', name: 'Courage', source: 'PRESET', chosenAt: '2026-09-01T00:00:00' }],
        statements: [{ id: 's', userId: 'u', type: 'GOAL', body: 'Run 5K', createdAt: '2026-09-01T00:00:00' }],
        decisions: [],
      },
      { now, promptLabel: (key) => (key === 'gratitude' ? 'Grateful for' : undefined) },
    );
    expect(text.indexOf('Newer line')).toBeLessThan(text.indexOf('Older line'));
    expect(text).toContain('**Grateful for**');
    expect(text).toContain('> second line');
    expect(text).toContain('Inner weather: Clear');
    expect(text).toContain('- Courage');
    expect(text).toContain('- Run 5K');
    expect(text).toContain('- Call the plumber (Open)');
    expect(text).toContain('  and the boiler');
  });

  it('leaves out other apps’ records', () => {
    const text = readableExport(
      { lifeItems: [item({ app: 'soma' as never, title: 'A recipe record' })], reflections: [], values: [], statements: [], decisions: [] },
      { now },
    );
    expect(text).not.toContain('A recipe record');
  });
});
