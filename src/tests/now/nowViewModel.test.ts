import type { LifeItem } from '../../core/life-items/types';
import { buildNowViewModel } from '../../features/now/nowViewModel';

function item(overrides: Partial<LifeItem>): LifeItem {
  return {
    id: 'id',
    userId: 'user-1',
    type: 'DO',
    title: 'Item',
    status: 'OPEN',
    important: false,
    source: 'MANUAL',
    carried: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

const now = new Date('2026-10-01T12:00:00.000Z');

describe('now view model', () => {
  it('is empty when nothing was marked, scheduled, or left unsorted', () => {
    expect(buildNowViewModel([item({})], now).isEmpty).toBe(true);
  });

  it('picks the next commitment by time, not importance', () => {
    const view = buildNowViewModel(
      [
        item({ id: 'past', scheduledAt: '2026-10-01T08:00:00.000Z' }),
        item({ id: 'later', scheduledAt: '2026-10-03T09:00:00.000Z', important: true }),
        item({ id: 'soon', scheduledAt: '2026-10-01T15:00:00.000Z' }),
      ],
      now,
    );

    expect(view.nextCommitment?.id).toBe('soon');
    expect(view.scheduled.map((i) => i.id)).toEqual(['past', 'soon', 'later']);
  });

  it('groups waiting and unsorted items', () => {
    const view = buildNowViewModel(
      [
        item({ id: 'w', status: 'WAITING', checkBackAt: '2026-10-04' }),
        item({ id: 'u1', type: null }),
        item({ id: 'u2', type: null }),
      ],
      now,
    );

    expect(view.waiting.map((i) => i.id)).toEqual(['w']);
    expect(view.unsortedCount).toBe(2);
  });
});
