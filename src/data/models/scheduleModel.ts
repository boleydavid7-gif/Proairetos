export type SchedulePatternModel = {
  id: string;
  userId: string;
  kind: 'COMMITTED' | 'PROTECTED';
  patternType: 'WEEKLY' | 'ROTATION' | 'CUSTOM';
  anchorDate: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  patternData: Record<string, unknown>;
};

export type ScheduleExceptionModel = {
  id: string;
  patternId: string;
  date: string;
  changeType: string;
  newValue?: Record<string, unknown>;
};
