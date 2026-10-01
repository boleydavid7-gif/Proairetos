import type { ItemEventModel } from '../../models/itemEventModel';
import type { LifeItemModel } from '../../models/lifeItemModel';
import type { ReflectionModel } from '../../models/reflectionModel';
import type { ItemEventRepository } from '../itemEventRepository';
import type { LifeItemRepository } from '../lifeItemRepository';
import type { ReflectionRepository } from '../reflectionRepository';

// Copies on the way in and out so callers can never mutate stored records.
const copy = <T>(value: T): T => structuredClone(value);

export function createMemoryLifeItemRepository(): LifeItemRepository {
  const items = new Map<string, LifeItemModel>();

  return {
    async create(item) {
      if (items.has(item.id)) throw new Error(`Life item ${item.id} already exists.`);
      items.set(item.id, copy(item));
      return copy(item);
    },
    async getById(id) {
      const item = items.get(id);
      return item ? copy(item) : null;
    },
    async list(userId) {
      return [...items.values()].filter((item) => item.userId === userId).map(copy);
    },
    async update(item) {
      if (!items.has(item.id)) throw new Error(`Life item ${item.id} does not exist.`);
      items.set(item.id, copy(item));
      return copy(item);
    },
    async remove(id) {
      items.delete(id);
    },
  };
}

export function createMemoryItemEventRepository(): ItemEventRepository {
  let events: ItemEventModel[] = [];

  return {
    async append(newEvents) {
      events.push(...newEvents.map(copy));
    },
    async listForItem(itemId) {
      return events.filter((event) => event.itemId === itemId).map(copy);
    },
    async listForItems(itemIds) {
      const ids = new Set(itemIds);
      return events.filter((event) => ids.has(event.itemId)).map(copy);
    },
    async remove(eventIds) {
      const ids = new Set(eventIds);
      events = events.filter((event) => !ids.has(event.id));
    },
  };
}

export function createMemoryReflectionRepository(): ReflectionRepository {
  const reflections: ReflectionModel[] = [];

  return {
    async create(reflection) {
      reflections.push(copy(reflection));
      return copy(reflection);
    },
    async list(userId) {
      return reflections.filter((reflection) => reflection.userId === userId).map(copy);
    },
  };
}
