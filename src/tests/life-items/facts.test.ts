import { describe, expect, it } from 'vitest';
import { itemFacts } from '../../core/life-items/facts';
import type { LifeItem } from '../../core/life-items/types';

const item = (fields: Partial<LifeItem>): LifeItem => ({
  id: 'i', userId: 'u', type: 'DO', title: 'Renew passport', status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  createdAt: '2026-09-23T10:00:00', updatedAt: '2026-09-23T10:00:00', ...fields,
});

describe('item facts', () => {
  it('lists marks, dates, and age in a fixed order, without weighing them', () => {
    const facts = itemFacts(
      item({ important: true, valueIds: ['v1', 'gone'], plannedFor: '2026-10-03', status: 'WAITING' }),
      '2026-10-02',
      new Map([['v1', 'Courage']]),
    );
    expect(facts).toEqual(['Marked important', 'Linked to Courage', 'Planned for tomorrow', 'Waiting on someone or something', 'Added 9 days ago']);
    expect(itemFacts(item({ createdAt: '2026-10-02T08:00:00' }), '2026-10-02', new Map())).toEqual(['Added today']);
  });
});
