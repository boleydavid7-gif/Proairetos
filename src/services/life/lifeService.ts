import type { DomainContext } from '../../core/context';
import type { ItemEvent } from '../../core/item-events/types';
import {
  captureItem,
  changeStatus,
  connectValue,
  disconnectValue,
  completeRoutine,
  recordDecision,
  recordFocus,
  rollRoutineForward,
  setNextStep,
  setPickedFor,
  setRepeat,
  setStepPlan,
  skipRoutine,
  MAX_TODAY_PICKS,
  setControlSplit,
  editItem,
  scheduleItem,
  setCarried,
  setCheckBack,
  setImportant,
  setItemType,
  type ItemChange,
  type StatusOptions,
} from '../../core/life-items/commands';
import type { ControlSplit, LifeItem, LifeItemStatus, LifeItemType } from '../../core/life-items/types';
import type { ItemEventRepository } from '../../data/repositories/itemEventRepository';
import type { LifeItemRepository } from '../../data/repositories/lifeItemRepository';
import { createListeners } from '../listeners';

export type Undo = () => Promise<void>;

export type UndoableChange = {
  item: LifeItem;
  undo: Undo;
};

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

  // Changes run one at a time. Two quick taps (say, leaving a text field and
  // tapping a chip) would otherwise both read the same item and the second
  // write would silently undo the first.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function save(change: ItemChange, isNew = false): Promise<LifeItem> {
    const item = isNew ? await items.create(change.item) : await items.update(change.item);
    if (change.events.length > 0) await events.append(change.events);
    listeners.notify();
    return item;
  }

  // Routines whose time has passed are presented at their next time; see rollRoutineForward.
  const present = (item: LifeItem) => rollRoutineForward(item, context.now());

  async function load(id: string): Promise<LifeItem> {
    const item = await items.getById(id);
    if (!item || item.userId !== userId) throw new Error(`Life item ${id} was not found.`);
    return present(item);
  }

  function apply(id: string, command: (item: LifeItem) => ItemChange): Promise<LifeItem> {
    return serial(async () => save(command(await load(id))));
  }

  /**
   * Applies a change that can be taken back. Undo restores the item exactly
   * and removes the events, because an undone change did not happen.
   */
  function applyUndoable(id: string, command: (item: LifeItem) => ItemChange): Promise<UndoableChange> {
    return serial(async () => {
      const before = await load(id);
      const change = command(before);
      const item = await save(change);
      let undone = false;

      return {
        item,
        undo: () =>
          serial(async () => {
            if (undone) return;
            undone = true;
            await items.update(before);
            await events.remove(change.events.map((event) => event.id));
            listeners.notify();
          }),
      };
    });
  }

  return {
    subscribe: listeners.subscribe,
    /** Tells screens to reload, e.g. after sync brought changes from another device. */
    refresh: listeners.notify,

    async list(): Promise<LifeItem[]> {
      return (await items.list(userId)).map(present);
    },

    async get(id: string): Promise<LifeItem | null> {
      const item = await items.getById(id);
      return item && item.userId === userId ? present(item) : null;
    },

    history(itemId: string): Promise<ItemEvent[]> {
      return events.listForItem(itemId);
    },

    /**
     * Deletes an item and its history for good, with an undo that restores
     * both exactly. Unlike Let go, nothing of it remains.
     */
    deleteItem(id: string): Promise<{ undo: Undo }> {
      return serial(async () => {
        const item = await items.getById(id);
        if (!item || item.userId !== userId) throw new Error(`Life item ${id} was not found.`);
        const history = await events.listForItem(id);
        await events.remove(history.map((event) => event.id));
        await items.remove(id);
        listeners.notify();
        let undone = false;
        return {
          undo: () =>
            serial(async () => {
              if (undone) return;
              undone = true;
              await items.create(item);
              await events.append(history);
              listeners.notify();
            }),
        };
      });
    },

    async historyForAll(): Promise<ItemEvent[]> {
      const all = await items.list(userId);
      return events.listForItems(all.map((item) => item.id));
    },

    capture(title: string, type: LifeItemType | null = null): Promise<LifeItem> {
      return serial(() => save(captureItem(context, { userId, title, type }), true));
    },

    sort(id: string, type: LifeItemType | null) {
      return apply(id, (item) => setItemType(context, item, type));
    },

    /** Done on a routine records it and moves it to its next time; otherwise a normal status change. */
    setStatus(id: string, status: LifeItemStatus, options?: StatusOptions): Promise<UndoableChange> {
      return applyUndoable(id, (item) =>
        status === 'DONE' && item.repeat && item.status === 'OPEN'
          ? completeRoutine(context, item)
          : changeStatus(context, item, status, options),
      );
    },

    skipRoutine(id: string): Promise<UndoableChange> {
      return applyUndoable(id, (item) => skipRoutine(context, item));
    },

    setRepeat(id: string, rule: Parameters<typeof setRepeat>[2]) {
      return apply(id, (item) => setRepeat(context, item, rule));
    },

    setStepPlan(id: string, plan: { nextStepCue?: string; ifObstacle?: string }) {
      return apply(id, (item) => setStepPlan(context, item, plan));
    },

    /** One of up to three for a day, chosen by the person. */
    pickForDay(id: string, date: string | undefined): Promise<LifeItem> {
      // The count and the change happen in one queued step, so quick taps cannot exceed the limit.
      return serial(async () => {
        if (date) {
          const picked = (await items.list(userId)).filter((item) => item.pickedFor === date && item.id !== id);
          if (picked.length >= MAX_TODAY_PICKS) throw new Error(`Up to ${MAX_TODAY_PICKS} for a day. Unpick one first.`);
        }
        return save(setPickedFor(context, await load(id), date));
      });
    },

    setCheckBack(id: string, checkBackAt: string | undefined) {
      return apply(id, (item) => setCheckBack(context, item, checkBackAt));
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

    connectValue(id: string, valueId: string) {
      return apply(id, (item) => connectValue(context, item, valueId));
    },

    disconnectValue(id: string, valueId: string) {
      return apply(id, (item) => disconnectValue(context, item, valueId));
    },

    setNextStep(id: string, step: string | undefined) {
      return apply(id, (item) => setNextStep(context, item, step));
    },

    recordDecision(id: string, decisionId: string) {
      return apply(id, (item) => recordDecision(context, item, decisionId));
    },

    recordFocus(id: string, minutes: number) {
      return apply(id, (item) => recordFocus(context, item, minutes));
    },

    /** Clears the times of several items at once, e.g. after time away. Each is recorded. */
    async clearTimes(ids: string[]): Promise<void> {
      for (const id of ids) await apply(id, (item) => scheduleItem(context, item, undefined));
    },

    setControlSplit(id: string, split: ControlSplit) {
      return apply(id, (item) => setControlSplit(context, item, split));
    },

    edit(id: string, changes: { title?: string; notes?: string }) {
      return apply(id, (item) => editItem(context, item, changes));
    },
  };
}

export type LifeService = ReturnType<typeof createLifeService>;
