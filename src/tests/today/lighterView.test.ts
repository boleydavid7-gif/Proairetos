import { describe, expect, it } from 'vitest';
import type { LifeItem } from '../../core/life-items/types';
import { nextThing } from '../../features/today/LighterView';

const item = (fields: Partial<LifeItem>): LifeItem => ({
  id: fields.title ?? 'x', userId: 'u', type: 'DO', title: 'x', status: 'OPEN', important: false, source: 'MANUAL', carried: false,
  createdAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-01T09:00:00.000Z', ...fields,
});

describe('lighter view', () => {
  it('offers the first of today’s path, in the order chosen', () => {
    const items = [
      item({ title: 'Second', pickedFor: '2026-10-02', pickedAt: '2026-10-02T08:05:00.000Z' }),
      item({ title: 'First', pickedFor: '2026-10-02', pickedAt: '2026-10-02T08:00:00.000Z' }),
      item({ title: 'Important', important: true }),
    ];
    expect(nextThing(items, '2026-10-02')?.title).toBe('First');
  });

  it('falls back to something marked important, and otherwise nothing', () => {
    expect(nextThing([item({ title: 'Important', important: true })], '2026-10-02')?.title).toBe('Important');
    expect(nextThing([item({ title: 'Plain' }), item({ title: 'Done', important: true, status: 'DONE' })], '2026-10-02')).toBeUndefined();
  });
});
