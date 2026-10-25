import { describe, expect, it } from 'vitest';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import { combineReadingSessions, studySessions } from '../../app/praxis/study';

const block = (id: string, title: string): LifeItem => ({
  id,
  userId: 'user',
  app: 'praxis',
  type: 'MAKE_TIME_FOR',
  title,
  status: 'OPEN',
  important: false,
  source: 'MANUAL',
  carried: false,
  createdAt: '2026-10-25T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
});

const focused = (id: string, itemId: string, at: string, minutes: number): ItemEvent => ({
  id,
  itemId,
  kind: 'FOCUSED',
  timestamp: at,
  metadata: { app: 'praxis', minutes },
});

describe('Theoria reading in Proairetos', () => {
  it('marks Read blocks as reading while leaving other Praxis blocks as study', () => {
    const sessions = studySessions(
      [block('book', 'Read: Atlas of the Heart'), block('work', 'Write notes')],
      [focused('a', 'book', '2026-10-25T09:00:00.000Z', 1), focused('b', 'work', '2026-10-25T10:00:00.000Z', 25)],
    );
    expect(sessions.map((session) => session.kind)).toEqual(['reading', 'study']);
  });

  it('combines reading stretches for one book on one day without merging Praxis sessions', () => {
    const sessions = studySessions(
      [block('book', 'Read: Atlas of the Heart'), block('work', 'Write notes')],
      [
        focused('a', 'book', '2026-10-25T09:00:00.000Z', 1),
        focused('b', 'book', '2026-10-25T11:00:00.000Z', 1),
        focused('c', 'book', '2026-10-26T09:00:00.000Z', 3),
        focused('d', 'work', '2026-10-25T10:00:00.000Z', 25),
      ],
    );
    const combined = combineReadingSessions(sessions);
    expect(combined.map(({ title, minutes }) => [title, minutes])).toEqual([
      ['Read: Atlas of the Heart', 2],
      ['Read: Atlas of the Heart', 3],
      ['Write notes', 25],
    ]);
  });
});
