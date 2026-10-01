import type { DomainContext } from '../context';
import { MAX_USER_VALUES, MAX_VALUE_NAME_LENGTH, presetValues, type ChosenValue } from './types';

export function canChooseMoreValues(currentCount: number): boolean {
  return currentCount < MAX_USER_VALUES;
}

export class ValueChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueChoiceError';
  }
}

/** Creates a chosen value, enforcing the five-value limit and no duplicates. */
export function chooseValue(
  ctx: DomainContext,
  userId: string,
  name: string,
  current: ChosenValue[],
): ChosenValue {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) throw new ValueChoiceError('A value needs a name.');
  if (trimmed.length > MAX_VALUE_NAME_LENGTH) {
    throw new ValueChoiceError(`Keep a value to ${MAX_VALUE_NAME_LENGTH} characters.`);
  }
  if (!canChooseMoreValues(current.length)) {
    throw new ValueChoiceError(`You can hold up to ${MAX_USER_VALUES} values at a time.`);
  }
  if (current.some((value) => value.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new ValueChoiceError(`${trimmed} is already one of your values.`);
  }

  const preset = presetValues.find((value) => value.toLowerCase() === trimmed.toLowerCase());
  return {
    id: ctx.newId(),
    userId,
    name: preset ?? trimmed,
    source: preset ? 'PRESET' : 'CUSTOM',
    chosenAt: ctx.now().toISOString(),
  };
}
