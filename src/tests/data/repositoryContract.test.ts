import { IDBFactory } from 'fake-indexeddb';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Reflection } from '../../core/reflections/types';
import {
  createIndexedDbCompassStatementRepository,
  createIndexedDbItemEventRepository,
  createIndexedDbLifeItemRepository,
  createIndexedDbReflectionRepository,
  createIndexedDbSchedulePatternRepository,
  createIndexedDbValueRepository,
} from '../../data/repositories/indexeddb/indexedDbRepositories';
import {
  createMemoryCompassStatementRepository,
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
  createMemoryReflectionRepository,
  createMemoryValueRepository,
} from '../../data/repositories/memory/memoryRepositories';
import { openDatabase } from '../../data/storage/indexeddb/database';

const implementations = {
  memory: () => ({
    items: createMemoryLifeItemRepository(),
    events: createMemoryItemEventRepository(),
    reflections: createMemoryReflectionRepository(),
    values: createMemoryValueRepository(),
    statements: createMemoryCompassStatementRepository(),
  }),
  indexeddb: () => {
    const db = openDatabase(new IDBFactory());
    return {
      items: createIndexedDbLifeItemRepository(db),
      events: createIndexedDbItemEventRepository(db),
      reflections: createIndexedDbReflectionRepository(db),
      values: createIndexedDbValueRepository(db),
      statements: createIndexedDbCompassStatementRepository(db),
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

describe.each(Object.entries(implementations))('%s compass repositories', (_name, create) => {
  it('adds, lists per person, and removes values and statements', async () => {
    const { values, statements } = create();
    const value = { id: 'v', userId: 'u', name: 'Courage', source: 'PRESET' as const, chosenAt: '2026-10-01' };
    const statement = { id: 's', userId: 'u', type: 'REMEMBER' as const, body: 'People over plans', createdAt: '2026-10-01' };

    await values.add(value);
    await values.add({ ...value, id: 'v2', userId: 'someone-else' });
    await statements.add(statement);

    expect(await values.list('u')).toEqual([value]);
    expect(await statements.list('u')).toEqual([statement]);
    await expect(values.add(value)).rejects.toThrow();

    await values.remove('v');
    await statements.remove('s');
    expect(await values.list('u')).toEqual([]);
    expect(await statements.list('u')).toEqual([]);
  });
});

describe('indexeddb schedule stores', () => {
  it('upgrades a version 2 database and stores schedules', async () => {
    const factory = new IDBFactory();
    const v2 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('proairetos', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of ['lifeItems', 'reflections', 'values', 'statements']) {
          db.createObjectStore(name, { keyPath: 'id' }).createIndex('userId', 'userId');
        }
        const events = db.createObjectStore('itemEvents', { keyPath: 'seq', autoIncrement: true });
        events.createIndex('id', 'id', { unique: true });
        events.createIndex('itemId', 'itemId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await createIndexedDbValueRepository(Promise.resolve(v2)).add({
      id: 'v', userId: 'u', name: 'Calm', source: 'PRESET', chosenAt: 'x',
    });
    v2.close();

    const v3 = openDatabase(factory);
    expect((await v3).version).toBe(3);
    expect(await createIndexedDbValueRepository(v3).list('u')).toHaveLength(1);

    const patterns = createIndexedDbSchedulePatternRepository(v3);
    const pattern = {
      id: 'p', userId: 'u', name: 'Work', kind: 'COMMITTED' as const, layout: 'CYCLE' as const,
      anchorDate: '2026-09-29', segments: [{ days: 1, blocks: [] }], createdAt: 'x', updatedAt: 'x',
    };
    await patterns.add(pattern);
    await patterns.put({ ...pattern, name: 'Plant' });
    expect((await patterns.list('u')).map((p) => p.name)).toEqual(['Plant']);
  });
});

describe('indexeddb persistence', () => {
  it('upgrades a version 1 database without losing anything', async () => {
    const factory = new IDBFactory();
    // Recreate the version 1 schema exactly as it shipped, with data in it.
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('proairetos', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('lifeItems', { keyPath: 'id' }).createIndex('userId', 'userId');
        const events = db.createObjectStore('itemEvents', { keyPath: 'seq', autoIncrement: true });
        events.createIndex('id', 'id', { unique: true });
        events.createIndex('itemId', 'itemId');
        db.createObjectStore('reflections', { keyPath: 'id' }).createIndex('userId', 'userId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await createIndexedDbLifeItemRepository(Promise.resolve(v1)).create(lifeItem('kept'));
    await createIndexedDbItemEventRepository(Promise.resolve(v1)).append([itemEvent('e', 'kept')]);
    v1.close();

    const v2 = openDatabase(factory);
    expect((await v2).version).toBe(3);
    expect((await createIndexedDbLifeItemRepository(v2).list('u')).map((item) => item.id)).toEqual(['kept']);
    expect(await createIndexedDbItemEventRepository(v2).listForItem('kept')).toHaveLength(1);
    await createIndexedDbValueRepository(v2).add({ id: 'v', userId: 'u', name: 'Calm', source: 'PRESET', chosenAt: 'x' });
    expect(await createIndexedDbValueRepository(v2).list('u')).toHaveLength(1);
  });

  it('keeps data across reopening the database', async () => {
    const factory = new IDBFactory();
    const first = await openDatabase(factory);
    await createIndexedDbLifeItemRepository(Promise.resolve(first)).create(lifeItem('a'));
    first.close();

    const reopened = createIndexedDbLifeItemRepository(openDatabase(factory));
    expect((await reopened.list('u')).map((item) => item.id)).toEqual(['a']);
  });
});
