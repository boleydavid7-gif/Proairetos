import type { Attachment } from '../../../core/attachments/types';
import type { AttachmentRepository } from '../attachmentRepository';
import type { CompassStatementModel } from '../../models/compassStatementModel';
import type { DecisionModel } from '../../models/decisionModel';
import type { ItemEventModel } from '../../models/itemEventModel';
import type { LifeItemModel } from '../../models/lifeItemModel';
import type { ReflectionModel } from '../../models/reflectionModel';
import type { ScheduleExceptionModel, SchedulePatternModel } from '../../models/scheduleModel';
import type { ChosenValueModel } from '../../models/valueModel';
import type { CompassStatementRepository } from '../compassStatementRepository';
import type { DecisionRepository } from '../decisionRepository';
import { requestToPromise, stores, transactionDone, type StoreName } from '../../storage/indexeddb/database';
import type { ItemEventRepository } from '../itemEventRepository';
import type { LifeItemRepository } from '../lifeItemRepository';
import type { ReflectionRepository } from '../reflectionRepository';
import type { ScheduleExceptionRepository, SchedulePatternRepository } from '../scheduleRepository';
import type { ValueRepository } from '../valueRepository';

type Db = Promise<IDBDatabase>;

async function read<T>(db: Db, store: StoreName, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const tx = (await db).transaction(store, 'readonly');
  return requestToPromise(run(tx.objectStore(store)));
}

async function write(db: Db, store: StoreName, run: (store: IDBObjectStore) => void): Promise<void> {
  const tx = (await db).transaction(store, 'readwrite');
  run(tx.objectStore(store));
  await transactionDone(tx);
}

export function createIndexedDbLifeItemRepository(db: Db): LifeItemRepository {
  async function getById(id: string): Promise<LifeItemModel | null> {
    return (await read<LifeItemModel | undefined>(db, stores.lifeItems, (store) => store.get(id))) ?? null;
  }

  return {
    async create(item) {
      await write(db, stores.lifeItems, (store) => store.add(item));
      return item;
    },
    getById,
    list(userId) {
      return read<LifeItemModel[]>(db, stores.lifeItems, (store) => store.index('userId').getAll(userId));
    },
    async update(item) {
      if (!(await getById(item.id))) throw new Error(`Life item ${item.id} does not exist.`);
      await write(db, stores.lifeItems, (store) => store.put(item));
      return item;
    },
    async remove(id) {
      await write(db, stores.lifeItems, (store) => store.delete(id));
    },
  };
}

export function createIndexedDbItemEventRepository(db: Db): ItemEventRepository {
  // Index order is itemId, then the auto-increment key: the order events were written.
  async function listForItem(itemId: string): Promise<ItemEventModel[]> {
    const stored = await read<(ItemEventModel & { seq?: number })[]>(db, stores.itemEvents, (store) =>
      store.index('itemId').getAll(itemId),
    );
    return stored.map(({ seq: _seq, ...event }) => event);
  }

  return {
    async append(events) {
      if (events.length === 0) return;
      await write(db, stores.itemEvents, (store) => events.forEach((event) => store.add(event)));
    },
    listForItem,
    async listForItems(itemIds) {
      const lists = await Promise.all(itemIds.map(listForItem));
      return lists.flat();
    },
    async remove(eventIds) {
      if (eventIds.length === 0) return;
      await write(db, stores.itemEvents, (store) => {
        for (const id of eventIds) {
          const lookup = store.index('id').getKey(id);
          lookup.onsuccess = () => {
            if (lookup.result !== undefined) store.delete(lookup.result);
          };
        }
      });
    },
  };
}

export function createIndexedDbReflectionRepository(db: Db): ReflectionRepository {
  return {
    async create(reflection) {
      await write(db, stores.reflections, (store) => store.add(reflection));
      return reflection;
    },
    list(userId) {
      return read<ReflectionModel[]>(db, stores.reflections, (store) => store.index('userId').getAll(userId));
    },
    async remove(id) {
      await write(db, stores.reflections, (store) => store.delete(id));
    },
  };
}

function createUserCollection<T extends { id: string; userId: string }>(db: Db, store: StoreName) {
  return {
    list(userId: string) {
      return read<T[]>(db, store, (objects) => objects.index('userId').getAll(userId));
    },
    async add(record: T) {
      await write(db, store, (objects) => objects.add(record));
      return record;
    },
    async put(record: T) {
      await write(db, store, (objects) => objects.put(record));
      return record;
    },
    async remove(id: string) {
      await write(db, store, (objects) => objects.delete(id));
    },
  };
}

export function createIndexedDbSchedulePatternRepository(db: Db): SchedulePatternRepository {
  return createUserCollection<SchedulePatternModel>(db, stores.schedulePatterns);
}

export function createIndexedDbScheduleExceptionRepository(db: Db): ScheduleExceptionRepository {
  return createUserCollection<ScheduleExceptionModel>(db, stores.scheduleExceptions);
}

export function createIndexedDbAttachmentRepository(db: Db): AttachmentRepository {
  return createUserCollection<Attachment>(db, stores.attachments);
}

export function createIndexedDbDecisionRepository(db: Db): DecisionRepository {
  return createUserCollection<DecisionModel>(db, stores.decisions);
}

export function createIndexedDbValueRepository(db: Db): ValueRepository {
  return createUserCollection<ChosenValueModel>(db, stores.values);
}

export function createIndexedDbCompassStatementRepository(db: Db): CompassStatementRepository {
  return createUserCollection<CompassStatementModel>(db, stores.statements);
}
