export const ScheduleKinds = {
  COMMITTED: 'COMMITTED',
  PROTECTED: 'PROTECTED',
} as const;

export type ScheduleKind = typeof ScheduleKinds[keyof typeof ScheduleKinds];

export const SchedulePatternTypes = {
  WEEKLY: 'WEEKLY',
  ROTATION: 'ROTATION',
  CUSTOM: 'CUSTOM',
} as const;

export type SchedulePatternType =
  typeof SchedulePatternTypes[keyof typeof SchedulePatternTypes];

export interface SchedulePattern {
  id: string;
  userId: string;
  kind: ScheduleKind;
  patternType: SchedulePatternType;
  anchorDate: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  patternData: unknown;
}
