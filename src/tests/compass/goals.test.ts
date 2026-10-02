import { describe, expect, it } from 'vitest';
import { goalRecord } from '../../core/compass/goals';
import type { LifeItem } from '../../core/life-items/types';

const item = (id: string, fields: Partial<LifeItem>): LifeItem => ({
  id, userId: 'u', type: 'DO', title: id, status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  createdAt: `2026-09-0${id.length}T10:00:00Z`, updatedAt: '2026-09-20T10:00:00Z', goalId: 'g', ...fields,
});

describe('goal record', () => {
  it('lists open steps and done steps with when, nothing more', () => {
    const record = goalRecord(
      'g',
      [item('a', {}), item('bb', { status: 'DONE' }), item('ccc', { status: 'DONE' }), item('other', { goalId: 'h' }), item('dd', { status: 'LET_GO' })],
      [
        { id: '1', itemId: 'bb', kind: 'COMPLETED', timestamp: '2026-09-25T08:00:00Z' },
        { id: '2', itemId: 'ccc', kind: 'COMPLETED', timestamp: '2026-09-28T08:00:00Z' },
      ],
    );
    expect(record.open.map((i) => i.id)).toEqual(['a']);
    expect(record.done.map((d) => [d.item.id, d.at])).toEqual([
      ['ccc', '2026-09-28T08:00:00Z'],
      ['bb', '2026-09-25T08:00:00Z'],
    ]);
  });
});

describe('goal lines', () => {
  it('names the goal and its oldest open step beside its time', async () => {
    const { goalLines } = await import('../../core/compass/goals');
    const goal = { id: 'g', userId: 'u', type: 'GOAL' as const, body: 'Learn guitar', createdAt: '', patternId: 'p' };
    const lines = goalLines([goal, { ...goal, id: 'h', patternId: undefined }], [item('a', { title: 'Learn three chords' })]);
    expect([...lines]).toEqual([['p', 'For Learn guitar · Next: Learn three chords']]);
    const named = goalLines([goal], [], [{ id: 'p', name: 'Learn guitar' }]);
    expect([...named]).toEqual([]);
  });
});
