import type { TagColor } from '../../core/look/tagColors';
import type { DomainContext } from '../../core/context';
import { writeStatement } from '../../core/compass/statements';
import { MAX_GOALS, MAX_PEOPLE, MAX_STATEMENT_LENGTH, type CompassStatement, type CompassStatementType } from '../../core/compass/types';
import { chooseValue } from '../../core/values/rules';
import type { ChosenValue } from '../../core/values/types';
import type { CompassStatementRepository } from '../../data/repositories/compassStatementRepository';
import type { ValueRepository } from '../../data/repositories/valueRepository';
import { createListeners } from '../listeners';

export type CompassServiceDeps = {
  userId: string;
  context: DomainContext;
  values: ValueRepository;
  statements: CompassStatementRepository;
};

/** Holds what the person chose to keep in sight. It stores; it never suggests. */
export function createCompassService({ userId, context, values, statements }: CompassServiceDeps) {
  const listeners = createListeners();
  const byChosen = (a: ChosenValue, b: ChosenValue) => a.chosenAt.localeCompare(b.chosenAt);
  const byCreated = (a: CompassStatement, b: CompassStatement) => a.createdAt.localeCompare(b.createdAt);

  return {
    subscribe: listeners.subscribe,
    /** Tells screens to reload, e.g. after sync brought changes from another device. */
    refresh: listeners.notify,

    async values(): Promise<ChosenValue[]> {
      return (await values.list(userId)).sort(byChosen);
    },

    async chooseValue(name: string): Promise<ChosenValue> {
      const value = chooseValue(context, userId, name, await values.list(userId));
      await values.add(value);
      listeners.notify();
      return value;
    },

    /** Removes a value, with an undo that puts it back exactly. */
    async removeValue(id: string): Promise<{ undo: () => Promise<void> }> {
      const value = (await values.list(userId)).find((v) => v.id === id);
      await values.remove(id);
      listeners.notify();
      let undone = false;
      return {
        undo: async () => {
          if (undone || !value) return;
          undone = true;
          await values.add(value);
          listeners.notify();
        },
      };
    },

    async statements(): Promise<CompassStatement[]> {
      return (await statements.list(userId)).sort(byCreated);
    },

    async writeStatement(type: CompassStatementType, body: string): Promise<CompassStatement> {
      const statement = writeStatement(context, userId, type, body);
      await statements.add(statement);
      listeners.notify();
      return statement;
    },

    /** Adds someone who matters, by name. A short list, kept by the person. */
    async addPerson(name: string): Promise<CompassStatement> {
      const people = (await statements.list(userId)).filter((s) => s.type === 'PERSON');
      if (people.length >= MAX_PEOPLE) throw new Error(`Up to ${MAX_PEOPLE} people. Remove one to add another.`);
      const person = writeStatement(context, userId, 'PERSON', name);
      await statements.add(person);
      listeners.notify();
      return person;
    },

    /** Adds something the person is working toward. A few at a time. */
    async addGoal(body: string): Promise<CompassStatement> {
      const open = (await statements.list(userId)).filter((s) => s.type === 'GOAL' && !s.reachedAt);
      if (open.length >= MAX_GOALS) throw new Error(`Up to ${MAX_GOALS} at a time. Mark one reached or set one down to add another.`);
      const goal = writeStatement(context, userId, 'GOAL', body);
      await statements.add(goal);
      listeners.notify();
      return goal;
    },

    /** Changes a goal's note or reached mark, with an undo that puts it back as it was. */
    async updateGoal(id: string, changes: { note?: string; reachedAt?: string | null; color?: TagColor | null; patternId?: string | null }): Promise<{ goal: CompassStatement; undo: () => Promise<void> }> {
      const goal = (await statements.list(userId)).find((s) => s.id === id && s.type === 'GOAL');
      if (!goal) throw new Error('That is no longer on your list.');
      const updated: CompassStatement = { ...goal };
      if ('note' in changes) {
        const note = changes.note?.trim();
        if (note) updated.note = note.slice(0, MAX_STATEMENT_LENGTH);
        else delete updated.note;
      }
      if ('reachedAt' in changes) {
        if (changes.reachedAt) updated.reachedAt = changes.reachedAt;
        else delete updated.reachedAt;
      }
      if ('color' in changes) {
        if (changes.color) updated.color = changes.color;
        else delete updated.color;
      }
      if ('patternId' in changes) {
        if (changes.patternId) updated.patternId = changes.patternId;
        else delete updated.patternId;
      }
      await statements.remove(id);
      await statements.add(updated);
      listeners.notify();
      return {
        goal: updated,
        undo: async () => {
          await statements.remove(id);
          await statements.add(goal);
          listeners.notify();
        },
      };
    },

    /** Changes a person's note or in-touch date; everything else stays as it was. */
    async updatePerson(id: string, changes: { note?: string; inTouchAt?: string | null }): Promise<CompassStatement> {
      const person = (await statements.list(userId)).find((s) => s.id === id && s.type === 'PERSON');
      if (!person) throw new Error('That person is no longer on your list.');
      const updated: CompassStatement = { ...person };
      if ('note' in changes) {
        const note = changes.note?.trim();
        if (note) updated.note = note.slice(0, MAX_STATEMENT_LENGTH);
        else delete updated.note;
      }
      if ('inTouchAt' in changes) {
        if (changes.inTouchAt) updated.inTouchAt = changes.inTouchAt;
        else delete updated.inTouchAt;
      }
      await statements.remove(id);
      await statements.add(updated);
      listeners.notify();
      return updated;
    },

    /** Removes a statement, with an undo that puts it back exactly. */
    async removeStatement(id: string): Promise<{ undo: () => Promise<void> }> {
      const statement = (await statements.list(userId)).find((s) => s.id === id);
      await statements.remove(id);
      listeners.notify();
      let undone = false;
      return {
        undo: async () => {
          if (undone || !statement) return;
          undone = true;
          await statements.add(statement);
          listeners.notify();
        },
      };
    },
  };
}

export type CompassService = ReturnType<typeof createCompassService>;
