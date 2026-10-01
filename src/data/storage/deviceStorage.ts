import type { CompassStatementRepository } from '../repositories/compassStatementRepository';
import {
  createIndexedDbCompassStatementRepository,
  createIndexedDbItemEventRepository,
  createIndexedDbLifeItemRepository,
  createIndexedDbReflectionRepository,
  createIndexedDbValueRepository,
} from '../repositories/indexeddb/indexedDbRepositories';
import type { ItemEventRepository } from '../repositories/itemEventRepository';
import type { LifeItemRepository } from '../repositories/lifeItemRepository';
import {
  createMemoryCompassStatementRepository,
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
  createMemoryReflectionRepository,
  createMemoryValueRepository,
} from '../repositories/memory/memoryRepositories';
import type { ReflectionRepository } from '../repositories/reflectionRepository';
import type { ValueRepository } from '../repositories/valueRepository';
import { openDatabase } from './indexeddb/database';

export type StorageMode = 'device' | 'memory';

export type Repositories = {
  items: LifeItemRepository;
  events: ItemEventRepository;
  reflections: ReflectionRepository;
  values: ValueRepository;
  statements: CompassStatementRepository;
};

type Backend = Repositories & { mode: StorageMode };

async function openBackend(): Promise<Backend> {
  try {
    const db = await openDatabase();
    // Ask the browser not to evict this data under storage pressure.
    navigator.storage?.persist?.().catch(() => undefined);
    const ready = Promise.resolve(db);
    return {
      mode: 'device',
      items: createIndexedDbLifeItemRepository(ready),
      events: createIndexedDbItemEventRepository(ready),
      reflections: createIndexedDbReflectionRepository(ready),
      values: createIndexedDbValueRepository(ready),
      statements: createIndexedDbCompassStatementRepository(ready),
    };
  } catch (error) {
    console.warn('On-device storage is unavailable; keeping data in memory for this visit.', error);
    return {
      mode: 'memory',
      items: createMemoryLifeItemRepository(),
      events: createMemoryItemEventRepository(),
      reflections: createMemoryReflectionRepository(),
      values: createMemoryValueRepository(),
      statements: createMemoryCompassStatementRepository(),
    };
  }
}

/** Forwards every call to whichever backend opens, so callers never wait on setup themselves. */
function deferred<T extends object>(target: Promise<T>): T {
  return new Proxy({} as T, {
    get(_object, key) {
      // Not a promise itself: keeps `await repository` from hanging.
      if (key === 'then') return undefined;
      return async (...args: unknown[]) => {
        const resolved = (await target) as Record<PropertyKey, (...a: unknown[]) => unknown>;
        return resolved[key](...args);
      };
    },
  });
}

export function createDeviceStorage(): Repositories & { mode: Promise<StorageMode> } {
  const backend = openBackend();
  return {
    mode: backend.then((b) => b.mode),
    items: deferred(backend.then((b) => b.items)),
    events: deferred(backend.then((b) => b.events)),
    reflections: deferred(backend.then((b) => b.reflections)),
    values: deferred(backend.then((b) => b.values)),
    statements: deferred(backend.then((b) => b.statements)),
  };
}
