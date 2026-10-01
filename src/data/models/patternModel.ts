export type PatternModel = {
  id: string;
  userId: string;
  type: string;
  subjectId?: string | null;
  description: string;
  createdAt: string;
};

export type PatternDismissalModel = {
  userId: string;
  patternType: string;
  subjectId?: string | null;
  dismissedAt: string;
};
