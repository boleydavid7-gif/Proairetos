import { describe, expect, it } from 'vitest';
import { fromAWhileAgo } from '../../core/rhythm/aWhileAgo';
import type { LifeItem } from '../../core/life-items/types';

const now = new Date(2026, 9, 2, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
let n = 0;
const item = (fields: Partial<LifeItem>): LifeItem => {
  n += 1;
  return {
    id: `i${n}`, userId: 'u', type: null, title: `Item ${n}`, status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
    captureKind: 'CONCERN', createdAt: daysAgo(30), updatedAt: daysAgo(30), ...fields,
  };
};

describe('from a while ago', () => {
  it('shows open concerns noted three weeks ago or more, oldest first', () => {
    const items = [
      item({ title: 'Recent', createdAt: daysAgo(5) }),
      item({ title: 'Older', createdAt: daysAgo(40) }),
      item({ title: 'Old', createdAt: daysAgo(25) }),
      item({ title: 'Closed', status: 'LET_GO' }),
      item({ title: 'A thought', captureKind: 'THOUGHT' }),
    ];
    expect(fromAWhileAgo(items, now, {}).map((i) => i.title)).toEqual(['Older', 'Old']);
  });

  it('rests a kept concern for a month', () => {
    const kept = item({ title: 'Kept' });
    expect(fromAWhileAgo([kept], now, { [kept.id]: daysAgo(10) })).toEqual([]);
    expect(fromAWhileAgo([kept], now, { [kept.id]: daysAgo(31) }).map((i) => i.title)).toEqual(['Kept']);
  });

  it('shows at most three', () => {
    const items = Array.from({ length: 5 }, () => item({}));
    expect(fromAWhileAgo(items, now, {})).toHaveLength(3);
  });
});
