import type { DomainContext } from '../context';
import { MAX_USER_VALUES, MAX_VALUE_NAME_LENGTH, MAX_VALUE_PRINCIPLES, MAX_VALUE_PRINCIPLE_LENGTH, presetValues, type ChosenValue } from './types';

export function canChooseMoreValues(currentCount: number): boolean {
  return currentCount < MAX_USER_VALUES;
}

export class ValuePrincipleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValuePrincipleError';
  }
}

/** Normalizes a person's principles without inventing or rewriting their meaning. */
export function normalizeValuePrinciples(principles: readonly string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const entry of principles) {
    const principle = entry.trim().replace(/\s+/g, ' ');
    if (!principle) continue;
    if (principle.length > MAX_VALUE_PRINCIPLE_LENGTH) {
      throw new ValuePrincipleError(`Keep a principle to ${MAX_VALUE_PRINCIPLE_LENGTH} characters.`);
    }
    const key = principle.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(principle);
    }
  }

  if (normalized.length > MAX_VALUE_PRINCIPLES) {
    throw new ValuePrincipleError(`Keep up to ${MAX_VALUE_PRINCIPLES} principles for each value.`);
  }

  return normalized;
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
