import type { DomainContext } from '../../core/context';
import { isWithin, periodRange, type ReflectPeriod } from '../../core/reflections/periods';
import type { Reflection, ReflectionKind } from '../../core/reflections/types';
import type { ReflectionRepository } from '../../data/repositories/reflectionRepository';
import { createListeners } from '../listeners';

export type ReflectionServiceDeps = {
  userId: string;
  context: DomainContext;
  reflections: ReflectionRepository;
};

export type WriteReflectionInput = {
  body: string;
  kind?: ReflectionKind;
  itemId?: string;
  decisionId?: string;
  promptKey?: string;
};

/**
 * Stores what the person writes, exactly as written. The text is never
 * analyzed, summarized, or scored.
 */
export function createReflectionService({ userId, context, reflections }: ReflectionServiceDeps) {
  const listeners = createListeners();

  return {
    subscribe: listeners.subscribe,
    /** Tells screens to reload, e.g. after sync brought changes from another device. */
    refresh: listeners.notify,

    async write(input: WriteReflectionInput): Promise<Reflection> {
      if (!input.body.trim()) throw new Error('A reflection needs some text.');

      const reflection = await reflections.create({
        id: context.newId(),
        userId,
        body: input.body,
        kind: input.kind ?? 'FREE',
        createdAt: context.now().toISOString(),
        itemId: input.itemId,
        decisionId: input.decisionId,
        promptKey: input.promptKey,
      });
      listeners.notify();
      return reflection;
    },

    /** Deletes a reflection, with an undo that puts it back exactly. */
    async remove(id: string): Promise<{ undo: () => Promise<void> }> {
      const reflection = (await reflections.list(userId)).find((r) => r.id === id);
      if (!reflection) throw new Error('That reflection no longer exists.');
      await reflections.remove(id);
      listeners.notify();
      let undone = false;
      return {
        undo: async () => {
          if (undone) return;
          undone = true;
          await reflections.create(reflection);
          listeners.notify();
        },
      };
    },

    /** Follow-up notes on one decision, oldest first. */
    async forDecision(decisionId: string): Promise<Reflection[]> {
      return (await reflections.list(userId))
        .filter((reflection) => reflection.decisionId === decisionId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async all(): Promise<Reflection[]> {
      return reflections.list(userId);
    },

    /** Reflections written in the period, newest first. */
    async listFor(period: ReflectPeriod): Promise<Reflection[]> {
      const range = periodRange(period, context.now());
      const all = await reflections.list(userId);
      return all
        .filter((reflection) => isWithin(reflection.createdAt, range))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

export type ReflectionService = ReturnType<typeof createReflectionService>;
