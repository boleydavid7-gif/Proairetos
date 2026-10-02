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
import type { ItemEventRepository } from '../itemEventRepository';
import type { LifeItemRepository } from '../lifeItemRepository';
import type { ReflectionRepository } from '../reflectionRepository';
import type { ScheduleExceptionRepository, SchedulePatternRepository } from '../scheduleRepository';
import type { ValueRepository } from '../valueRepository';

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
  let reflections: ReflectionModel[] = [];

  return {
    async create(reflection) {
      reflections.push(copy(reflection));
      return copy(reflection);
    },
    async list(userId) {
      return reflections.filter((reflection) => reflection.userId === userId).map(copy);
    },
    async remove(id) {
      reflections = reflections.filter((reflection) => reflection.id !== id);
    },
  };
}

/** A simple keyed collection owned by one person at a time. */
function createMemoryUserCollection<T extends { id: string; userId: string }>() {
  const records = new Map<string, T>();
  return {
    async list(userId: string) {
      return [...records.values()].filter((record) => record.userId === userId).map(copy);
    },
    async add(record: T) {
      if (records.has(record.id)) throw new Error(`Record ${record.id} already exists.`);
      records.set(record.id, copy(record));
      return copy(record);
    },
    async put(record: T) {
      records.set(record.id, copy(record));
      return copy(record);
    },
    async remove(id: string) {
      records.delete(id);
    },
  };
}

export function createMemorySchedulePatternRepository(): SchedulePatternRepository {
  return createMemoryUserCollection<SchedulePatternModel>();
}

export function createMemoryScheduleExceptionRepository(): ScheduleExceptionRepository {
  return createMemoryUserCollection<ScheduleExceptionModel>();
}

export function createMemoryAttachmentRepository(): AttachmentRepository {
  return createMemoryUserCollection<Attachment>();
}

export function createMemoryDecisionRepository(): DecisionRepository {
  return createMemoryUserCollection<DecisionModel>();
}

export function createMemoryValueRepository(): ValueRepository {
  return createMemoryUserCollection<ChosenValueModel>();
}

export function createMemoryCompassStatementRepository(): CompassStatementRepository {
  return createMemoryUserCollection<CompassStatementModel>();
}
