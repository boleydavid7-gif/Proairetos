export const ValueSources = {
  PRESET: 'PRESET',
  CUSTOM: 'CUSTOM',
} as const;

export type ValueSource = typeof ValueSources[keyof typeof ValueSources];

/** A value the person chose. The app never picks or ranks values. */
export interface ChosenValue {
  id: string;
  userId: string;
  name: string;
  source: ValueSource;
  chosenAt: string;
}

export const MAX_USER_VALUES = 5;
export const MAX_VALUE_NAME_LENGTH = 40;

/**
 * Starting points to choose from, offered alphabetically so none is
 * favoured. The first four are the Stoic cardinal virtues; people can
 * also write their own.
 */
export const presetValues: readonly string[] = [
  'Courage',
  'Justice',
  'Temperance',
  'Wisdom',
  'Calm',
  'Craft',
  'Curiosity',
  'Discipline',
  'Faith',
  'Family',
  'Freedom',
  'Friendship',
  'Generosity',
  'Growth',
  'Health',
  'Honesty',
  'Kindness',
  'Patience',
  'Presence',
  'Service',
];
