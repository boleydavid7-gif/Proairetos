import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
  createMemoryReflectionRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { createLifeService } from '../../services/life/lifeService';
import { createReflectionService } from '../../services/reflection/reflectionService';
import { testContext } from '../support/testContext';

describe('capture kinds, plan groups, and planned days', () => {
  function setup() {
    const { context } = testContext();
    const items = createMemoryLifeItemRepository();
    const events = createMemoryItemEventRepository();
    return createLifeService({ userId: 'u', context, items, events });
  }

  it('keeps the kind the person tagged a capture with', async () => {
    const service = setup();
    const item = await service.capture('Worried about the truck tires', null, { captureKind: 'CONCERN' });
    expect(item.captureKind).toBe('CONCERN');
    expect((await service.capture('No tag')).captureKind).toBeUndefined();
  });

  it('sets and clears a plan group and a planned day', async () => {
    const service = setup();
    const item = await service.capture('Laundry', 'DO', { planGroup: 'MAINTENANCE', plannedFor: '2026-10-01' });
    expect(item).toMatchObject({ planGroup: 'MAINTENANCE', plannedFor: '2026-10-01' });

    await service.setPlanGroup(item.id, 'MEANINGFUL');
    await service.setPlannedFor(item.id, '2026-10-02');
    expect(await service.get(item.id)).toMatchObject({ planGroup: 'MEANINGFUL', plannedFor: '2026-10-02' });
    expect((await service.history(item.id)).map((e) => e.kind)).toEqual(['CREATED', 'RESCHEDULED']);

    await service.setPlanGroup(item.id, undefined);
    expect((await service.get(item.id))?.planGroup).toBeUndefined();
  });
});

describe('intentions and inner weather', () => {
  function setup() {
    const { context } = testContext(new Date(2026, 9, 1, 9).toISOString());
    return createReflectionService({ userId: 'u', context, reflections: createMemoryReflectionRepository() });
  }

  it('keeps one intention per day, replaced on edit and cleared when empty', async () => {
    const service = setup();
    await service.setIntention('2026-10-01', 'Be present');
    await service.setIntention('2026-10-01', 'Be present, patient');
    expect((await service.intentionFor('2026-10-01'))?.body).toBe('Be present, patient');
    expect(await service.intentionFor('2026-10-02')).toBeUndefined();

    await service.setIntention('2026-10-01', '  ');
    expect(await service.intentionFor('2026-10-01')).toBeUndefined();
  });

  it('keeps intentions out of the reflection list', async () => {
    const service = setup();
    await service.setIntention('2026-10-01', 'Be present');
    await service.write({ body: 'Quiet morning', weather: 'CLEAR', valueIds: ['v1'] });
    const listed = await service.listFor('today');
    expect(listed.map((r) => r.body)).toEqual(['Quiet morning']);
    expect(listed[0]).toMatchObject({ weather: 'CLEAR', valueIds: ['v1'] });
  });
});
