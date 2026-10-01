import type { DomainContext } from '../context';
import type { ItemEvent, ItemEventKind } from '../item-events/types';
import { canTransition } from './transitions';
import type { LifeItem, LifeItemSource, LifeItemStatus, LifeItemType } from './types';

/**
 * Every change to a life item goes through these commands. Each returns the
 * updated item and the events that record what happened, so Reflect can show
 * history without the app interpreting it.
 */
export type ItemChange = {
  item: LifeItem;
  events: ItemEvent[];
};

export class InvalidTransitionError extends Error {
  constructor(from: LifeItemStatus, to: LifeItemStatus) {
    super(`A life item cannot move from ${from} to ${to}.`);
    this.name = 'InvalidTransitionError';
  }
}

export type CaptureInput = {
  userId: string;
  title: string;
  type?: LifeItemType | null;
  source?: LifeItemSource;
};

function event(
  ctx: DomainContext,
  itemId: string,
  kind: ItemEventKind,
  timestamp: string,
  fields: Partial<ItemEvent> = {},
): ItemEvent {
  return { id: ctx.newId(), itemId, kind, timestamp, ...fields };
}

function touch(item: LifeItem, timestamp: string, changes: Partial<LifeItem>): LifeItem {
  return { ...item, ...changes, updatedAt: timestamp };
}

export function captureItem(ctx: DomainContext, input: CaptureInput): ItemChange {
  const title = input.title.trim();
  if (!title) {
    throw new Error('A capture needs some text.');
  }

  const timestamp = ctx.now().toISOString();
  const item: LifeItem = {
    id: ctx.newId(),
    userId: input.userId,
    type: input.type ?? null,
    title,
    status: 'OPEN',
    important: false,
    source: input.source ?? 'CAPTURE',
    carried: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return { item, events: [event(ctx, item.id, 'CREATED', timestamp, { toType: item.type })] };
}

export function setItemType(ctx: DomainContext, item: LifeItem, type: LifeItemType | null): ItemChange {
  if (item.type === type) return { item, events: [] };

  const timestamp = ctx.now().toISOString();
  return {
    item: touch(item, timestamp, { type }),
    events: [event(ctx, item.id, 'TYPE_CHANGED', timestamp, { fromType: item.type, toType: type })],
  };
}

const statusEventKind: Record<LifeItemStatus, ItemEventKind> = {
  OPEN: 'REOPENED',
  WAITING: 'WAITING_STARTED',
  DONE: 'COMPLETED',
  LET_GO: 'LET_GO',
};

export type StatusOptions = {
  /** When moving to WAITING: the date the person chose to check back. */
  checkBackAt?: string;
};

export function changeStatus(
  ctx: DomainContext,
  item: LifeItem,
  to: LifeItemStatus,
  options: StatusOptions = {},
): ItemChange {
  if (!canTransition(item.status, to)) {
    throw new InvalidTransitionError(item.status, to);
  }

  const timestamp = ctx.now().toISOString();
  const fromStatus = item.status;
  const kind = fromStatus === 'WAITING' && to === 'OPEN' ? 'WAITING_ENDED' : statusEventKind[to];
  const checkBackAt = to === 'WAITING' ? options.checkBackAt : undefined;

  return {
    item: touch(item, timestamp, { status: to, checkBackAt }),
    events: [event(ctx, item.id, kind, timestamp, { fromStatus, toStatus: to })],
  };
}

/** Sets, moves, or clears the time an item is scheduled for. */
export function scheduleItem(ctx: DomainContext, item: LifeItem, at: string | undefined): ItemChange {
  if (item.scheduledAt === at) return { item, events: [] };

  const timestamp = ctx.now().toISOString();
  const kind = item.scheduledAt ? 'RESCHEDULED' : 'SCHEDULED';
  return {
    item: touch(item, timestamp, { scheduledAt: at }),
    events: [event(ctx, item.id, kind, timestamp, { fromTime: item.scheduledAt, toTime: at })],
  };
}

export function setCarried(ctx: DomainContext, item: LifeItem, carried: boolean): ItemChange {
  if (item.carried === carried) return { item, events: [] };

  const timestamp = ctx.now().toISOString();
  return {
    item: touch(item, timestamp, { carried }),
    events: [event(ctx, item.id, carried ? 'CARRIED' : 'UN_CARRIED', timestamp)],
  };
}

/** Importance is the person's own mark. It is stored but not logged as history. */
export function setImportant(ctx: DomainContext, item: LifeItem, important: boolean): ItemChange {
  if (item.important === important) return { item, events: [] };
  return { item: touch(item, ctx.now().toISOString(), { important }), events: [] };
}

export function editItem(
  ctx: DomainContext,
  item: LifeItem,
  changes: { title?: string; notes?: string },
): ItemChange {
  const title = changes.title?.trim();
  if (changes.title !== undefined && !title) {
    throw new Error('A life item needs a title.');
  }
  return {
    item: touch(item, ctx.now().toISOString(), {
      ...(title ? { title } : {}),
      ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
    }),
    events: [],
  };
}
