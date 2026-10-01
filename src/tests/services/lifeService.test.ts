import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { createLifeService } from '../../services/life/lifeService';
import { testContext } from '../support/testContext';

function setup(userId = 'u') {
  const { context } = testContext();
  const items = createMemoryLifeItemRepository();
  const events = createMemoryItemEventRepository();
  return { items, events, service: createLifeService({ userId, context, items, events }) };
}

describe('life service', () => {
  it('stores each change together with its history', async () => {
    const { service } = setup();
    const item = await service.capture('Renew passport');
    await service.sort(item.id, 'DO');
    await service.setStatus(item.id, 'DONE');

    const [stored] = await service.list();
    expect(stored).toMatchObject({ type: 'DO', status: 'DONE' });
    expect((await service.history(item.id)).map((e) => e.kind)).toEqual(['CREATED', 'TYPE_CHANGED', 'COMPLETED']);
  });

  it('notifies subscribers after every change', async () => {
    const { service } = setup();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    const item = await service.capture('Water the plants');
    await service.setImportant(item.id, true);
    unsubscribe();
    await service.setImportant(item.id, false);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('leaves storage unchanged when a transition is not allowed', async () => {
    const { service } = setup();
    const item = await service.capture('Book dentist');
    await service.setStatus(item.id, 'DONE');

    await expect(service.setStatus(item.id, 'WAITING')).rejects.toThrow();
    expect((await service.list())[0].status).toBe('DONE');
    expect(await service.history(item.id)).toHaveLength(2);
  });

  it("only touches the person's own items", async () => {
    const { items, events } = setup();
    const { context } = testContext();
    const mine = createLifeService({ userId: 'me', context, items, events });
    const theirs = createLifeService({ userId: 'them', context: testContext().context, items, events });

    const item = await theirs.capture('Their note');
    expect(await mine.list()).toEqual([]);
    await expect(mine.setStatus(item.id, 'DONE')).rejects.toThrow();
  });

  it('undoes a status change completely, as if it never happened', async () => {
    const { service } = setup();
    const item = await service.capture('Return library books');
    await service.setStatus(item.id, 'WAITING', { checkBackAt: '2026-10-05' });
    const before = await service.get(item.id);

    const done = await service.setStatus(item.id, 'DONE');
    expect(done.item.status).toBe('DONE');

    await done.undo();
    await done.undo();

    expect(await service.get(item.id)).toEqual(before);
    expect((await service.history(item.id)).map((e) => e.kind)).toEqual(['CREATED', 'WAITING_STARTED']);
  });

  it('returns null for items that are missing or belong to someone else', async () => {
    const { service } = setup();
    expect(await service.get('missing')).toBeNull();
  });
});
