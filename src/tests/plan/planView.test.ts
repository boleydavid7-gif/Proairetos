import { describe, expect, it } from 'vitest';
import type { LifeItem } from '../../core/life-items/types';
import { planFor } from '../../features/plan/planView';

const today = '2026-10-01';
let n = 0;
function item(fields: Partial<LifeItem>): LifeItem {
  n += 1;
  return {
    id: `i${n}`,
    userId: 'u',
    type: 'DO',
    title: `Item ${n}`,
    status: 'OPEN',
    important: false,
    source: 'MANUAL',
    carried: false,
    createdAt: `2026-09-2${n % 10}T10:00:00.000Z`,
    updatedAt: `2026-09-2${n % 10}T10:00:00.000Z`,
    ...fields,
  };
}
const titles = (sections: ReturnType<typeof planFor>) =>
  Object.fromEntries(sections.map((s) => [s.id, s.open.map((i) => i.title)]));

describe('plan for a day', () => {
  it('groups by the person’s own marks', () => {
    const items = [
      item({ title: 'Finish report', important: true }),
      item({ title: 'Laundry', planGroup: 'MAINTENANCE' }),
      item({ title: 'Reading', planGroup: 'MEANINGFUL' }),
      item({ title: 'Call bank' }),
    ];
    expect(titles(planFor(today, today, items))).toEqual({
      IMPORTANT: ['Finish report'],
      MAINTENANCE: ['Laundry'],
      MEANINGFUL: ['Reading'],
      OTHER: ['Call bank'],
    });
  });

  it('leaves thoughts and feelings in Capture', () => {
    const items = [item({ title: 'Feeling tired', type: null, captureKind: 'EMOTION' }), item({ title: 'Idea', type: 'THINKING_ABOUT' })];
    expect(planFor(today, today, items)).toEqual([]);
  });

  it('shows dated items on their day, and still-open earlier ones on today', () => {
    const items = [
      item({ title: 'Tomorrow thing', plannedFor: '2026-10-02' }),
      item({ title: 'Earlier thing', plannedFor: '2026-09-29' }),
      item({ title: 'Undated' }),
    ];
    expect(titles(planFor(today, today, items))).toEqual({ OTHER: ['Earlier thing', 'Undated'] });
    expect(titles(planFor('2026-10-02', today, items))).toEqual({ OTHER: ['Tomorrow thing'] });
  });

  it('keeps things done that day, checked', () => {
    const doneToday = item({ title: 'Call family', status: 'DONE', updatedAt: new Date(2026, 9, 1, 15).toISOString() });
    const doneBefore = item({ title: 'Old', status: 'DONE', updatedAt: new Date(2026, 8, 20, 15).toISOString() });
    const [section] = planFor(today, today, [doneToday, doneBefore]);
    expect(section.done.map((i) => i.title)).toEqual(['Call family']);
  });
});
