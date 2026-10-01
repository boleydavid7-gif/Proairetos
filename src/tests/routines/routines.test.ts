import { completeRoutine, rollRoutineForward, setRepeat, skipRoutine } from '../../core/life-items/commands';
import { describeRule, nextOccurrence, occurrenceOnOrAfter } from '../../core/life-items/repeat';
import type { LifeItem } from '../../core/life-items/types';
import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { createLifeService } from '../../services/life/lifeService';
import { testContext } from '../support/testContext';

const local = (iso: string) => {
  const d = new Date(iso);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
};
const at = (day: number, hour = 7, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();

const routine = (fields: Partial<LifeItem>): LifeItem => ({
  id: 'r',
  userId: 'u',
  type: 'MAKE_TIME_FOR',
  title: 'Stretch',
  status: 'OPEN',
  important: false,
  source: 'MANUAL',
  carried: false,
  createdAt: '',
  updatedAt: '',
  scheduledAt: at(1),
  repeat: { kind: 'EVERY_N_DAYS', interval: 1 },
  ...fields,
});

describe('repeat rules', () => {
  it('finds the next time, keeping the time of day', () => {
    expect(local(nextOccurrence({ kind: 'EVERY_N_DAYS', interval: 1 }, at(1, 7, 30)))).toEqual([2026, 10, 2, 7, 30]);
    expect(local(nextOccurrence({ kind: 'EVERY_N_DAYS', interval: 3 }, at(1)))).toEqual([2026, 10, 4, 7, 0]);
  });

  it('follows chosen weekdays (Thursday 1 Oct -> next Monday)', () => {
    const mondaysAndThursdays = { kind: 'WEEKDAYS' as const, days: [0, 3] };
    expect(local(nextOccurrence(mondaysAndThursdays, at(1)))).toEqual([2026, 10, 5, 7, 0]);
    expect(local(occurrenceOnOrAfter(mondaysAndThursdays, at(1), '2026-10-06'))).toEqual([2026, 10, 8, 7, 0]);
  });

  it('keeps every-N-day rhythms anchored when rolling forward', () => {
    expect(local(occurrenceOnOrAfter({ kind: 'EVERY_N_DAYS', interval: 3 }, at(1), '2026-10-05'))).toEqual([2026, 10, 7, 7, 0]);
  });

  it('describes rules plainly', () => {
    expect(describeRule({ kind: 'WEEKDAYS', days: [4, 0, 1, 2, 3] })).toBe('Weekdays');
    expect(describeRule({ kind: 'WEEKDAYS', days: [0, 3] })).toBe('Mon, Thu');
    expect(describeRule({ kind: 'EVERY_N_DAYS', interval: 2 })).toBe('Every 2 days');
  });
});

describe('routine commands', () => {
  const { context } = testContext(at(1, 8));

  it('needs a time before it can repeat', () => {
    expect(() => setRepeat(context, routine({ scheduledAt: undefined, repeat: undefined }), { kind: 'EVERY_N_DAYS', interval: 1 })).toThrow();
  });

  it('records done and moves to the next time, staying open', () => {
    const change = completeRoutine(context, routine({ nextStep: 'Mat out' }));
    expect(change.item.status).toBe('OPEN');
    expect(local(change.item.scheduledAt!)).toEqual([2026, 10, 2, 7, 0]);
    expect(change.item.nextStep).toBeUndefined();
    expect(change.events[0]).toMatchObject({ kind: 'COMPLETED', metadata: { routine: true, occurrence: at(1) } });
  });

  it('skips without recording anything', () => {
    const change = skipRoutine(context, routine({}));
    expect(change.events).toEqual([]);
    expect(local(change.item.scheduledAt!)).toEqual([2026, 10, 2, 7, 0]);
  });

  it('rolls a missed time forward to today, never piling up', () => {
    const rolled = rollRoutineForward(routine({ scheduledAt: at(1) }), new Date(2026, 9, 5, 12));
    expect(local(rolled.scheduledAt!)).toEqual([2026, 10, 5, 7, 0]);
    expect(rollRoutineForward(routine({ scheduledAt: at(1), status: 'DONE' }), new Date(2026, 9, 5)).scheduledAt).toBe(at(1));
  });
});

describe('routines in the service', () => {
  function setup(start = at(1, 8)) {
    const clock = testContext(start);
    const service = createLifeService({
      userId: 'u',
      context: clock.context,
      items: createMemoryLifeItemRepository(),
      events: createMemoryItemEventRepository(),
    });
    return { service, clock };
  }

  it('completing a routine can be undone exactly', async () => {
    const { service } = setup();
    const item = await service.capture('Stretch');
    await service.schedule(item.id, at(1, 7));
    await service.setRepeat(item.id, { kind: 'EVERY_N_DAYS', interval: 1 });
    const before = await service.get(item.id);

    const done = await service.setStatus(item.id, 'DONE');
    expect(local(done.item.scheduledAt!)).toEqual([2026, 10, 2, 7, 0]);
    await done.undo();
    expect(await service.get(item.id)).toEqual(before);
  });

  it('shows a routine at its next time after days away', async () => {
    const { service, clock } = setup();
    const item = await service.capture('Stretch');
    await service.schedule(item.id, at(1, 7));
    await service.setRepeat(item.id, { kind: 'WEEKDAYS', days: [0, 1, 2, 3, 4] });
    clock.advance(4 * 86_400_000); // Monday 5 Oct
    expect(local((await service.get(item.id))!.scheduledAt!)).toEqual([2026, 10, 5, 7, 0]);
  });

  it('allows up to three picks for a day, even with quick taps', async () => {
    const { service } = setup();
    const ids = await Promise.all(['a', 'b', 'c', 'd'].map(async (t) => (await service.capture(t)).id));
    const results = await Promise.allSettled(ids.map((id) => service.pickForDay(id, '2026-10-01')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect((await service.list()).filter((i) => i.pickedFor === '2026-10-01')).toHaveLength(3);
  });
});
