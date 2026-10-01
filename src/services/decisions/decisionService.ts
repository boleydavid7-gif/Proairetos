import type { DomainContext } from '../../core/context';
import { decisionsToRevisit, makeDecision, type DecisionInput } from '../../core/decisions/rules';
import type { Decision, DecisionOutcome, DecisionProcess } from '../../core/decisions/types';
import type { DecisionRepository } from '../../data/repositories/decisionRepository';
import { createListeners } from '../listeners';

export type DecisionServiceDeps = {
  userId: string;
  context: DomainContext;
  decisions: DecisionRepository;
};

/** Keeps the person's choices so they can look back. It never weighs options. */
export function createDecisionService({ userId, context, decisions }: DecisionServiceDeps) {
  const listeners = createListeners();

  async function load(id: string): Promise<Decision> {
    const decision = (await decisions.list(userId)).find((d) => d.id === id);
    if (!decision) throw new Error('That decision no longer exists.');
    return decision;
  }

  async function save(decision: Decision): Promise<Decision> {
    await decisions.put(decision);
    listeners.notify();
    return decision;
  }

  return {
    subscribe: listeners.subscribe,
    /** Tells screens to reload, e.g. after sync brought changes from another device. */
    refresh: listeners.notify,

    /** Newest first. */
    async list(): Promise<Decision[]> {
      return (await decisions.list(userId)).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
    },

    async get(id: string): Promise<Decision | null> {
      return (await decisions.list(userId)).find((d) => d.id === id) ?? null;
    },

    async decide(input: DecisionInput): Promise<Decision> {
      const decision = makeDecision(context, userId, input);
      await decisions.add(decision);
      listeners.notify();
      return decision;
    },

    async setRevisit(id: string, revisitAt: string | undefined): Promise<Decision> {
      return save({ ...(await load(id)), revisitAt, revisitedAt: undefined });
    },

    /** Records the two separate look-back answers and finishes revisiting. */
    async recordLookBack(id: string, process: DecisionProcess, outcome: DecisionOutcome): Promise<Decision> {
      const at = context.now().toISOString();
      return save({ ...(await load(id)), lookBack: { process, outcome, at }, revisitedAt: at });
    },

    async finishRevisiting(id: string): Promise<Decision> {
      return save({ ...(await load(id)), revisitedAt: context.now().toISOString() });
    },

    async remove(id: string): Promise<void> {
      await decisions.remove(id);
      listeners.notify();
    },

    async toRevisit(): Promise<Decision[]> {
      return decisionsToRevisit(await decisions.list(userId), context.now());
    },
  };
}

export type DecisionService = ReturnType<typeof createDecisionService>;
