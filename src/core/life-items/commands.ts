import type { DomainContext } from '../context';
import type { ItemEvent, ItemEventKind } from '../item-events/types';
import { canTransition } from './transitions';
import { isValidRule, nextOccurrence, occurrenceOnOrAfter, type RepeatRule } from './repeat';
import { toLocalDate } from '../scheduling/dates';
import type { CaptureKind, ChecklistLine, ControlSplit, LifeItem, LifeItemSource, LifeItemStatus, LifeItemType, PlanGroup } from './types';

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
  captureKind?: CaptureKind;
  planGroup?: PlanGroup;
  important?: boolean;
  plannedFor?: string;
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
    important: input.important ?? false,
    source: input.source ?? 'CAPTURE',
    carried: false,
    ...(input.captureKind ? { captureKind: input.captureKind } : {}),
    ...(input.planGroup ? { planGroup: input.planGroup } : {}),
    ...(input.plannedFor ? { plannedFor: input.plannedFor } : {}),
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

export function setLight(ctx: DomainContext, item: LifeItem, light: boolean): ItemChange {
  if (Boolean(item.light) === light) return { item, events: [] };
  return { item: touch(item, ctx.now().toISOString(), { light: light || undefined }), events: [] };
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

/** Moves the check-back date of a waiting item. The person's own reminder, not logged as history. */
export function setCheckBack(ctx: DomainContext, item: LifeItem, checkBackAt: string | undefined): ItemChange {
  if (item.status !== 'WAITING') {
    throw new Error('Only waiting items have a check-back date.');
  }
  if (item.checkBackAt === checkBackAt) return { item, events: [] };
  return { item: touch(item, ctx.now().toISOString(), { checkBackAt }), events: [] };
}

/** Connects one of the person's values to an item. Never done automatically. */
export function connectValue(ctx: DomainContext, item: LifeItem, valueId: string): ItemChange {
  const current = item.valueIds ?? [];
  if (current.includes(valueId)) return { item, events: [] };

  const timestamp = ctx.now().toISOString();
  return {
    item: touch(item, timestamp, { valueIds: [...current, valueId] }),
    events: [event(ctx, item.id, 'VALUE_CONNECTED', timestamp, { valueId })],
  };
}

export function disconnectValue(ctx: DomainContext, item: LifeItem, valueId: string): ItemChange {
  const current = item.valueIds ?? [];
  if (!current.includes(valueId)) return { item, events: [] };

  const timestamp = ctx.now().toISOString();
  return {
    item: touch(item, timestamp, { valueIds: current.filter((id) => id !== valueId) }),
    events: [event(ctx, item.id, 'VALUE_DISCONNECTED', timestamp, { valueId })],
  };
}

/** Saves what is and is not in the person's control. Only for Thinking about items. */
export function setControlSplit(ctx: DomainContext, item: LifeItem, split: ControlSplit): ItemChange {
  if (item.type !== 'THINKING_ABOUT') {
    throw new Error('The control split is for Thinking about items.');
  }
  const clean = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean);
  const controlSplit = { inMyControl: clean(split.inMyControl), notInMyControl: clean(split.notInMyControl) };
  const empty = controlSplit.inMyControl.length === 0 && controlSplit.notInMyControl.length === 0;

  return { item: touch(item, ctx.now().toISOString(), { controlSplit: empty ? undefined : controlSplit }), events: [] };
}

export const MAX_NEXT_STEP_LENGTH = 140;

/** Sets or clears the next small step. The person's own plan, not logged as history. */
export function setNextStep(ctx: DomainContext, item: LifeItem, step: string | undefined): ItemChange {
  const trimmed = step?.trim() || undefined;
  if (trimmed && trimmed.length > MAX_NEXT_STEP_LENGTH) {
    throw new Error(`Keep a next step to ${MAX_NEXT_STEP_LENGTH} characters.`);
  }
  if (item.nextStep === trimmed) return { item, events: [] };
  // A new or finished step starts with a fresh cue and plan.
  return {
    item: touch(item, ctx.now().toISOString(), { nextStep: trimmed, nextStepCue: undefined, ifObstacle: undefined }),
    events: [],
  };
}

/** Records time spent focusing on an item. Facts only: no targets, no streaks. */
export function recordFocus(ctx: DomainContext, item: LifeItem, minutes: number): ItemChange {
  const whole = Math.round(minutes);
  if (whole < 1) return { item, events: [] };
  const timestamp = ctx.now().toISOString();
  return { item, events: [event(ctx, item.id, 'FOCUSED', timestamp, { metadata: { minutes: whole } })] };
}

/** Notes on a Thinking about item that a decision was made from it. */
export function recordDecision(ctx: DomainContext, item: LifeItem, decisionId: string): ItemChange {
  const timestamp = ctx.now().toISOString();
  return { item, events: [event(ctx, item.id, 'DECIDED', timestamp, { metadata: { decisionId } })] };
}

/** Starts, changes, or ends a routine. A routine needs a time to repeat from. */
export function setRepeat(ctx: DomainContext, item: LifeItem, rule: RepeatRule | undefined): ItemChange {
  if (rule && !item.scheduledAt) throw new Error('Set a time first, then choose how it repeats.');
  if (rule && !isValidRule(rule)) throw new Error('Choose how often it repeats.');
  if (JSON.stringify(item.repeat) === JSON.stringify(rule)) return { item, events: [] };
  return { item: touch(item, ctx.now().toISOString(), { repeat: rule }), events: [] };
}

/**
 * A routine whose time has passed rolls forward to its next time today or
 * later. Nothing is marked missed; there is no pile.
 */
export function rollRoutineForward(item: LifeItem, now: Date): LifeItem {
  if (!item.repeat || !item.scheduledAt || item.status !== 'OPEN') return item;
  const today = toLocalDate(now);
  if (toLocalDate(new Date(item.scheduledAt)) >= today) return item;
  return {
    ...item,
    scheduledAt: occurrenceOnOrAfter(item.repeat, item.scheduledAt, today),
    ...(item.checklist ? { checklist: freshLines(item.checklist) } : {}),
  };
}

const freshLines = (lines: ChecklistLine[]) => lines.map((line) => ({ ...line, done: false }));

/** Finishing a routine records it as done and moves it to its next time. */
export function completeRoutine(ctx: DomainContext, item: LifeItem): ItemChange {
  if (!item.repeat || !item.scheduledAt) throw new Error('This item does not repeat.');
  const timestamp = ctx.now().toISOString();
  return {
    item: touch(item, timestamp, {
      scheduledAt: nextOccurrence(item.repeat, item.scheduledAt),
      nextStep: undefined,
      ...(item.checklist ? { checklist: freshLines(item.checklist) } : {}),
    }),
    events: [event(ctx, item.id, 'COMPLETED', timestamp, { metadata: { occurrence: item.scheduledAt, routine: true } })],
  };
}

/** Skips this time of a routine without recording anything against it. */
export function skipRoutine(ctx: DomainContext, item: LifeItem): ItemChange {
  if (!item.repeat || !item.scheduledAt) throw new Error('This item does not repeat.');
  return { item: touch(item, ctx.now().toISOString(), { scheduledAt: nextOccurrence(item.repeat, item.scheduledAt) }), events: [] };
}

export const MAX_TODAY_PICKS = 3;

/** Marks an item as one of the person's up to three for a day, or clears it. */
export function setPickedFor(ctx: DomainContext, item: LifeItem, date: string | undefined): ItemChange {
  if (item.pickedFor === date) return { item, events: [] };
  const timestamp = ctx.now().toISOString();
  return { item: touch(item, timestamp, { pickedFor: date, pickedAt: date ? timestamp : undefined }), events: [] };
}

/** The when/where cue and if-obstacle plan for the next step. */
export function setStepPlan(
  ctx: DomainContext,
  item: LifeItem,
  plan: { nextStepCue?: string; ifObstacle?: string },
): ItemChange {
  const clean = (text: string | undefined) => text?.trim() || undefined;
  return {
    item: touch(item, ctx.now().toISOString(), {
      ...('nextStepCue' in plan ? { nextStepCue: clean(plan.nextStepCue) } : {}),
      ...('ifObstacle' in plan ? { ifObstacle: clean(plan.ifObstacle) } : {}),
    }),
    events: [],
  };
}

/** The person's grouping on Plan, or none. */
export function setPlanGroup(ctx: DomainContext, item: LifeItem, group: PlanGroup | undefined): ItemChange {
  if (item.planGroup === group) return { item, events: [] };
  return { item: touch(item, ctx.now().toISOString(), { planGroup: group }), events: [] };
}

/** A day without a time, or none. Moving it is recorded like any other move. */
export function setPlannedFor(ctx: DomainContext, item: LifeItem, date: string | undefined): ItemChange {
  if (item.plannedFor === date) return { item, events: [] };
  const timestamp = ctx.now().toISOString();
  const events = item.plannedFor && date ? [event(ctx, item.id, 'RESCHEDULED', timestamp, { fromTime: item.plannedFor, toTime: date })] : [];
  return { item: touch(item, timestamp, { plannedFor: date }), events };
}

/** Sets a list's lines from text, keeping ticks on lines that stay the same. */
export function setChecklist(ctx: DomainContext, item: LifeItem, texts: string[]): ItemChange {
  const clean = texts.map((text) => text.trim()).filter(Boolean);
  const checklist = clean.length
    ? clean.map((text) => {
        const same = item.checklist?.find((line) => line.text === text);
        return same ?? { id: ctx.newId(), text, done: false };
      })
    : undefined;
  return { item: touch(item, ctx.now().toISOString(), { checklist }), events: [] };
}

export function toggleChecklistLine(ctx: DomainContext, item: LifeItem, lineId: string): ItemChange {
  if (!item.checklist) return { item, events: [] };
  const checklist = item.checklist.map((line) => (line.id === lineId ? { ...line, done: !line.done } : line));
  return { item: touch(item, ctx.now().toISOString(), { checklist }), events: [] };
}
