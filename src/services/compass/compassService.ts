import type { DomainContext } from '../../core/context';
import { writeStatement } from '../../core/compass/statements';
import type { CompassStatement, CompassStatementType } from '../../core/compass/types';
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

    async removeValue(id: string): Promise<void> {
      await values.remove(id);
      listeners.notify();
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

    async removeStatement(id: string): Promise<void> {
      await statements.remove(id);
      listeners.notify();
    },
  };
}

export type CompassService = ReturnType<typeof createCompassService>;
