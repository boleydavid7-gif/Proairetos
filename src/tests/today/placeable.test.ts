import { describe, expect, it } from 'vitest';
import type { LifeItem } from '../../core/life-items/types';
import { placeableGroups } from '../../features/today/placeable';

const item = (id: string, fields: Partial<LifeItem> = {}): LifeItem => ({
  id, userId: 'u', type: 'DO', title: id, status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  createdAt: `2026-09-${10 + id.length}T10:00:00`, updatedAt: '2026-09-20T10:00:00', ...fields,
});

describe('what can go into open time', () => {
  const items = [
    item('a'),
    item('bb', { light: true }),
    item('ccc', { pickedFor: '2026-10-02' }),
    item('dddd', { plannedFor: '2026-10-02' }),
    item('timed', { scheduledAt: '2026-10-02T15:00:00Z' }),
    item('routine', { repeat: { every: 1, unit: 'DAY' } as never }),
    item('closed', { status: 'DONE' }),
  ];

  it('groups by the person’s own choices and leaves out what already has a time', () => {
    const groups = placeableGroups(items, '2026-10-02', undefined);
    expect(groups.map((g) => [g.id, g.items.map((i) => i.id)])).toEqual([
      ['path', ['ccc']],
      ['planned', ['dddd']],
      ['rest', ['a', 'bb']],
    ]);
  });

  it('shows light things first only when the person says energy is low', () => {
    const groups = placeableGroups(items, '2026-10-02', 'low');
    expect(groups.map((g) => g.id)).toEqual(['path', 'planned', 'light', 'rest']);
    expect(groups[2].items.map((i) => i.id)).toEqual(['bb']);
  });
});
