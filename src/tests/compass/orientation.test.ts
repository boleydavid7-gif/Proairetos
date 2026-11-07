import { createDailyOrientation } from '../../core/compass/orientation';
import type { CompassStatement } from '../../core/compass/types';
import type { LifeItem } from '../../core/life-items/types';
import type { ChosenValue } from '../../core/values/types';

const value = (name: string, chosenAt: string): ChosenValue => ({ id: name, userId: 'u', name, source: 'CUSTOM', chosenAt });
const statement = (type: CompassStatement['type'], body: string, createdAt: string): CompassStatement => ({
  id: body,
  userId: 'u',
  type,
  body,
  createdAt,
});
const item = (id: string, scheduledAt: Date, status: LifeItem['status'] = 'OPEN'): LifeItem => ({
  id,
  userId: 'u',
  type: 'DO',
  title: id,
  status,
  important: false,
  source: 'MANUAL',
  carried: false,
  scheduledAt: scheduledAt.toISOString(),
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

describe('daily orientation', () => {
  const today = new Date(2026, 9, 1, 7, 0);

  it('reflects back the person’s own values and statements, oldest first', () => {
    const orientation = createDailyOrientation(
      [value('Patience', '2026-09-02'), value('Courage', '2026-09-01')],
      [
        statement('REMEMBER', 'Breathe before answering', '2026-09-03'),
        statement('PUSHED_ASIDE', 'Comparing myself to others', '2026-09-02'),
        statement('REMEMBER', 'People over plans', '2026-09-01'),
      ],
      [],
      today,
    );

    expect(orientation.values).toEqual(['Courage', 'Patience']);
    expect(orientation.remember).toEqual(['People over plans', 'Breathe before answering']);
    expect(orientation.pushedAside).toEqual(['Comparing myself to others']);
  });

  it('lists only open items scheduled for this local day, in time order', () => {
    const { scheduledToday } = createDailyOrientation(
      [],
      [],
      [
        item('afternoon', new Date(2026, 9, 1, 15)),
        item('morning', new Date(2026, 9, 1, 9)),
        item('tomorrow', new Date(2026, 9, 2, 9)),
        item('finished', new Date(2026, 9, 1, 10), 'DONE'),
      ],
      today,
    );

    expect(scheduledToday.map((i) => i.id)).toEqual(['morning', 'afternoon']);
  });
});
