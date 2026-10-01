import type { DomainContext } from '../../core/context';
import type { ItemEvent } from '../../core/item-events/types';
import {
  captureItem,
  changeStatus,
  editItem,
  scheduleItem,
  setCarried,
  setImportant,
  setItemType,
  type ItemChange,
  type StatusOptions,
} from '../../core/life-items/commands';
import type { LifeItem, LifeItemStatus, LifeItemType } from '../../core/life-items/types';
import type { ItemEventRepository } from '../../data/repositories/itemEventRepository';
import type { LifeItemRepository } from '../../data/repositories/lifeItemRepository';
import { createListeners } from '../listeners';

export type LifeServiceDeps = {
  userId: string;
  context: DomainContext;
  items: LifeItemRepository;
  events: ItemEventRepository;
};

/**
 * Applies core commands and persists the item together with its events.
 * Nothing here decides anything: it carries out what the person chose.
 */
export function createLifeService({ userId, context, items, events }: LifeServiceDeps) {
  const listeners = createListeners();

  async function save(change: ItemChange, isNew = false): Promise<LifeItem> {
    const item = isNew ? await items.create(change.item) : await items.update(change.item);
    if (change.events.length > 0) await events.append(change.events);
    listeners.notify();
    return item;
  }

  async function apply(id: string, command: (item: LifeItem) => ItemChange): Promise<LifeItem> {
    const item = await items.getById(id);
    if (!item || item.userId !== userId) throw new Error(`Life item ${id} was not found.`);
    return save(command(item));
  }

  return {
    subscribe: listeners.subscribe,

    list(): Promise<LifeItem[]> {
      return items.list(userId);
    },

    history(itemId: string): Promise<ItemEvent[]> {
      return events.listForItem(itemId);
    },

    async historyForAll(): Promise<ItemEvent[]> {
      const all = await items.list(userId);
      return events.listForItems(all.map((item) => item.id));
    },

    capture(title: string, type: LifeItemType | null = null): Promise<LifeItem> {
      return save(captureItem(context, { userId, title, type }), true);
    },

    sort(id: string, type: LifeItemType | null) {
      return apply(id, (item) => setItemType(context, item, type));
    },

    setStatus(id: string, status: LifeItemStatus, options?: StatusOptions) {
      return apply(id, (item) => changeStatus(context, item, status, options));
    },

    schedule(id: string, at: string | undefined) {
      return apply(id, (item) => scheduleItem(context, item, at));
    },

    setImportant(id: string, important: boolean) {
      return apply(id, (item) => setImportant(context, item, important));
    },

    setCarried(id: string, carried: boolean) {
      return apply(id, (item) => setCarried(context, item, carried));
    },

    edit(id: string, changes: { title?: string; notes?: string }) {
      return apply(id, (item) => editItem(context, item, changes));
    },
  };
}

export type LifeService = ReturnType<typeof createLifeService>;
