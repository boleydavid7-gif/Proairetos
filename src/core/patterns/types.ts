export const PatternTypes = {
  RESCHEDULE_COUNT: 'RESCHEDULE_COUNT',
  WAITING_DURATION: 'WAITING_DURATION',
  CONNECTED_VALUE_ACTIVITY: 'CONNECTED_VALUE_ACTIVITY',
} as const;

export type PatternType = typeof PatternTypes[keyof typeof PatternTypes];

export interface PatternDismissal {
  userId: string;
  patternType: PatternType;
  subjectId?: string;
  dismissedAt: string;
}

export interface DerivedPattern {
  type: PatternType;
  subjectId?: string;
  description: string;
}
