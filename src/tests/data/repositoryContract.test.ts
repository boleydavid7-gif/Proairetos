import { IDBFactory } from 'fake-indexeddb';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Reflection } from '../../core/reflections/types';
import {
  createIndexedDbItemEventRepository,
  createIndexedDbLifeItemRepository,
  createIndexedDbReflectionRepository,
} from '../../data/repositories/indexeddb/indexedDbRepositories';
import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
  createMemoryReflectionRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { openDatabase } from '../../data/storage/indexeddb/database';

const implementations = {
  memory: () => ({
    items: createMemoryLifeItemRepository(),
    events: createMemoryItemEventRepository(),
    reflections: createMemoryReflectionRepository(),
  }),
  indexeddb: () => {
    const db = openDatabase(new IDBFactory());
    return {
      items: createIndexedDbLifeItemRepository(db),
      events: createIndexedDbItemEventRepository(db),
      reflections: createIndexedDbReflectionRepository(db),
    };
  },
};

function lifeItem(id: string, userId = 'u'): LifeItem {
  return {
    id,
    userId,
    type: null,
    title: `Item ${id}`,
    status: 'OPEN',
    important: false,
    source: 'CAPTURE',
    carried: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

function itemEvent(id: string, itemId: string): ItemEvent {
  return { id, itemId, kind: 'CREATED', timestamp: '2026-10-01T12:00:00.000Z' };
}

describe.each(Object.entries(implementations))('%s repositories', (_name, create) => {
  it('creates, reads, updates, and removes life items', async () => {
    const { items } = create();
    await items.create(lifeItem('a'));
    await items.create(lifeItem('b', 'someone-else'));

    expect(await items.getById('a')).toMatchObject({ id: 'a' });
    expect(await items.getById('missing')).toBeNull();
    expect((await items.list('u')).map((item) => item.id)).toEqual(['a']);

    await items.update({ ...lifeItem('a'), status: 'DONE' });
    expect((await items.getById('a'))?.status).toBe('DONE');

    await items.remove('a');
    expect(await items.getById('a')).toBeNull();
  });

  it('refuses duplicate creates and updates to missing items', async () => {
    const { items } = create();
    await items.create(lifeItem('a'));

    await expect(items.create(lifeItem('a'))).rejects.toThrow();
    await expect(items.update(lifeItem('missing'))).rejects.toThrow();
  });

  it('returns copies, never the stored record', async () => {
    const { items } = create();
    const original = lifeItem('a');
    await items.create(original);
    original.title = 'changed after saving';

    const read = await items.getById('a');
    read!.title = 'changed after reading';
    expect((await items.getById('a'))?.title).toBe('Item a');
  });

  it('keeps event history in the order it was written', async () => {
    const { events } = create();
    const ids = ['id-1', 'id-10', 'id-2', 'id-9'];
    await events.append(ids.map((id) => itemEvent(id, 'item')));
    await events.append([itemEvent('other', 'other-item')]);

    expect((await events.listForItem('item')).map((event) => event.id)).toEqual(ids);
    expect(await events.listForItems(['item', 'other-item'])).toHaveLength(5);
  });

  it('removes events by id for undo', async () => {
    const { events } = create();
    await events.append([itemEvent('keep', 'item'), itemEvent('drop', 'item')]);
    await events.remove(['drop', 'never-existed']);

    expect((await events.listForItem('item')).map((event) => event.id)).toEqual(['keep']);
    expect(await events.listForItem('item')).toEqual([itemEvent('keep', 'item')]);
  });

  it('stores reflections per person', async () => {
    const { reflections } = create();
    const reflection: Reflection = {
      id: 'r',
      userId: 'u',
      body: 'Quiet morning.',
      kind: 'FREE',
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    await reflections.create(reflection);
    await reflections.create({ ...reflection, id: 'r2', userId: 'someone-else' });

    expect(await reflections.list('u')).toEqual([reflection]);
  });
});

describe('indexeddb persistence', () => {
  it('keeps data across reopening the database', async () => {
    const factory = new IDBFactory();
    const first = await openDatabase(factory);
    await createIndexedDbLifeItemRepository(Promise.resolve(first)).create(lifeItem('a'));
    first.close();

    const reopened = createIndexedDbLifeItemRepository(openDatabase(factory));
    expect((await reopened.list('u')).map((item) => item.id)).toEqual(['a']);
  });
});
