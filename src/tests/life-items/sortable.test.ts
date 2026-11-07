import { describe, expect, it } from 'vitest';
import { sortable } from '../../features/capture/QuickSortSheet';
import type { LifeItem } from '../../core/life-items/types';

const item = (id: string, fields: Partial<LifeItem> = {}): LifeItem => ({
  id, userId: 'u', type: null, title: id, status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  createdAt: `2026-09-0${id.length}T10:00:00Z`, updatedAt: '', ...fields,
});

describe('sort through', () => {
  it('keeps arrival order, or puts what has no kind first when asked', () => {
    const items = [item('a', { type: 'DO' }), item('bb'), item('ccc', { type: 'REMEMBER' }), item('dddd', { plannedFor: '2026-10-02' })];
    expect(sortable(items, '2026-10-02').map((i) => i.id)).toEqual(['a', 'bb', 'ccc']);
    expect(sortable(items, '2026-10-02', true).map((i) => i.id)).toEqual(['bb', 'a', 'ccc']);
  });
});
