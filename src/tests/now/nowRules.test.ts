import type { LifeItem } from '../../core/life-items/types';
import { isVisibleInNow, nowReasonsFor } from '../../core/now/rules';

const baseItem: LifeItem = {
  id: 'item-1',
  userId: 'user-1',
  type: 'DO',
  title: 'Call the clinic',
  status: 'OPEN',
  important: false,
  source: 'MANUAL',
  carried: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('now rules', () => {
  it('hides items the person has not marked, scheduled, or left unsorted', () => {
    expect(isVisibleInNow(baseItem)).toBe(false);
  });

  it('lists every reason the person set', () => {
    const item: LifeItem = { ...baseItem, important: true, scheduledAt: '2026-10-02T09:00:00.000Z' };
    expect(nowReasonsFor(item)).toEqual(['SCHEDULED', 'IMPORTANT']);
  });

  it('shows waiting items only when a check-back date is set', () => {
    expect(isVisibleInNow({ ...baseItem, status: 'WAITING' })).toBe(false);
    expect(nowReasonsFor({ ...baseItem, status: 'WAITING', checkBackAt: '2026-10-05' })).toEqual(['CHECK_BACK']);
  });

  it('shows unsorted captures', () => {
    expect(nowReasonsFor({ ...baseItem, type: null })).toEqual(['UNSORTED']);
  });

  it('never shows closed items', () => {
    expect(isVisibleInNow({ ...baseItem, important: true, status: 'DONE' })).toBe(false);
    expect(isVisibleInNow({ ...baseItem, important: true, status: 'LET_GO' })).toBe(false);
  });
});
