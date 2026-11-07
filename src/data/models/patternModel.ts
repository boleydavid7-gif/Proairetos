import type { PatternType } from '../../core/patterns/types';

export type PatternModel = {
  id: string;
  userId: string;
  type: PatternType;
  subjectId?: string | null;
  description: string;
  createdAt: string;
};

export type PatternDismissalModel = {
  userId: string;
  patternType: PatternType;
  subjectId?: string | null;
  dismissedAt: string;
};
