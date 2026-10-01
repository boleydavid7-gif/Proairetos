export const ValueSources = {
  PRESET: 'PRESET',
  CUSTOM: 'CUSTOM',
} as const;

export type ValueSource = typeof ValueSources[keyof typeof ValueSources];

export interface Value {
  id: string;
  userId?: string;
  name: string;
  source: ValueSource;
}

export interface UserValue {
  userId: string;
  valueId: string;
  chosenAt: string;
}

export const MAX_USER_VALUES = 5;
