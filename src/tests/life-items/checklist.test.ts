import { describe, expect, it } from 'vitest';
import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { createLifeService } from '../../services/life/lifeService';
import { testContext } from '../support/testContext';

describe('lists that come back', () => {
  function setup() {
    const { context, advance } = testContext(new Date(2026, 9, 4, 9).toISOString());
    const service = createLifeService({ userId: 'u', context, items: createMemoryLifeItemRepository(), events: createMemoryItemEventRepository() });
    return { service, advance };
  }

  it('ticks lines, and clears them when the list is done and comes round again', async () => {
    const { service } = setup();
    const list = await service.capture('Sunday reset', 'DO', { source: 'MANUAL' });
    await service.schedule(list.id, new Date(2026, 9, 4, 9).toISOString());
    await service.setRepeat(list.id, { kind: 'EVERY_N_DAYS', interval: 7 });
    await service.setChecklist(list.id, ['Laundry', 'Plan meals', ' ', 'Water plants']);

    let item = (await service.get(list.id))!;
    expect(item.checklist!.map((l) => l.text)).toEqual(['Laundry', 'Plan meals', 'Water plants']);
    await service.toggleChecklistLine(list.id, item.checklist![0].id);
    expect((await service.get(list.id))!.checklist!.map((l) => l.done)).toEqual([true, false, false]);

    await service.setStatus(list.id, 'DONE');
    item = (await service.get(list.id))!;
    expect(item.status).toBe('OPEN');
    expect(new Date(item.scheduledAt!).getDate()).toBe(11);
    expect(item.checklist!.every((l) => !l.done)).toBe(true);
  });

  it('comes back fresh if a week was missed', async () => {
    const { service, advance } = setup();
    const list = await service.capture('Sunday reset', 'DO');
    await service.schedule(list.id, new Date(2026, 9, 4, 9).toISOString());
    await service.setRepeat(list.id, { kind: 'EVERY_N_DAYS', interval: 7 });
    await service.setChecklist(list.id, ['Laundry']);
    const line = (await service.get(list.id))!.checklist![0];
    await service.toggleChecklistLine(list.id, line.id);
    advance(8 * 86_400_000);
    const item = (await service.get(list.id))!;
    expect(new Date(item.scheduledAt!).getDate()).toBe(18);
    expect(item.checklist![0].done).toBe(false);
  });

  it('keeps ticks on lines that stay the same when the list is edited', async () => {
    const { service } = setup();
    const list = await service.capture('Before a trip', 'DO');
    await service.setChecklist(list.id, ['Passport', 'Charger']);
    const passport = (await service.get(list.id))!.checklist![0];
    await service.toggleChecklistLine(list.id, passport.id);
    await service.setChecklist(list.id, ['Passport', 'Charger', 'Snacks']);
    expect((await service.get(list.id))!.checklist!.map((l) => [l.text, l.done])).toEqual([
      ['Passport', true],
      ['Charger', false],
      ['Snacks', false],
    ]);
  });
});
