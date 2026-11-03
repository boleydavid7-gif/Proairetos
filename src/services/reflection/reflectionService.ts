import type { DomainContext } from '../../core/context';
import { isWithin, periodRange, type ReflectPeriod } from '../../core/reflections/periods';
import type { InnerWeather, Reflection, ReflectionKind } from '../../core/reflections/types';
import type { Sky } from '../../core/weather/sky';
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
  weather?: InnerWeather;
  valueIds?: string[];
  sky?: Sky;
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
        ...(input.weather ? { weather: input.weather } : {}),
        ...(input.sky ? { sky: input.sky } : {}),
        ...(input.valueIds?.length ? { valueIds: input.valueIds } : {}),
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

    async all(includeArchived = false): Promise<Reflection[]> {
      const all = await reflections.list(userId);
      return includeArchived ? all : all.filter((reflection) => !reflection.archivedAt);
    },

    /** Archive keeps the original reflection intact and removes it from everyday Reflect views. */
    async archive(id: string): Promise<Reflection> {
      const reflection = (await reflections.list(userId)).find((entry) => entry.id === id);
      if (!reflection) throw new Error('That reflection no longer exists.');
      if (reflection.archivedAt) return reflection;
      const archived = { ...reflection, archivedAt: context.now().toISOString() };
      await reflections.update(archived);
      listeners.notify();
      return archived;
    },

    async restore(id: string): Promise<Reflection> {
      const reflection = (await reflections.list(userId)).find((entry) => entry.id === id);
      if (!reflection) throw new Error('That reflection no longer exists.');
      if (!reflection.archivedAt) return reflection;
      const { archivedAt: _archivedAt, ...restored } = reflection;
      await reflections.update(restored);
      listeners.notify();
      return restored;
    },

    /** Removes only the chosen value link; the reflection itself stays untouched. */
    async disconnectValue(id: string, valueId: string): Promise<Reflection> {
      const reflection = (await reflections.list(userId)).find((entry) => entry.id === id);
      if (!reflection) throw new Error('That reflection no longer exists.');
      const valueIds = (reflection.valueIds ?? []).filter((entry) => entry !== valueId);
      if (valueIds.length === (reflection.valueIds ?? []).length) return reflection;
      const { valueIds: _previous, ...withoutValues } = reflection;
      const updated = valueIds.length ? { ...reflection, valueIds } : withoutValues;
      await reflections.update(updated);
      listeners.notify();
      return updated;
    },

    /** The person's intention for a local date, if they wrote one. */
    async intentionFor(date: string): Promise<Reflection | undefined> {
      return (await reflections.list(userId)).find((r) => !r.archivedAt && r.kind === 'INTENTION' && r.periodStart === date);
    },

    /** Writes, replaces, or (with empty text) clears the intention for a day. */
    async setIntention(date: string, body: string, valueIds: string[] = []): Promise<void> {
      const existing = (await reflections.list(userId)).filter((r) => !r.archivedAt && r.kind === 'INTENTION' && r.periodStart === date);
      for (const old of existing) await reflections.remove(old.id);
      if (body.trim()) {
        await reflections.create({
          id: context.newId(),
          userId,
          body: body.trim(),
          kind: 'INTENTION',
          periodStart: date,
          createdAt: context.now().toISOString(),
          ...(valueIds.length ? { valueIds: [...new Set(valueIds)] } : {}),
        });
      }
      listeners.notify();
    },

    /** Reflections written in the period, newest first. Day intentions live on Today instead. */
    async listFor(period: ReflectPeriod): Promise<Reflection[]> {
      const range = periodRange(period, context.now());
      const all = await reflections.list(userId);
      return all
        .filter((reflection) => !reflection.archivedAt && reflection.kind !== 'INTENTION' && isWithin(reflection.createdAt, range))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

export type ReflectionService = ReturnType<typeof createReflectionService>;
