export type ReflectionKind =
  | 'FREE'
  | 'REVIEW'
  | 'DECISION_FOLLOWUP';

export interface Reflection {
  id: string;
  userId: string;
  body: string;
  kind: ReflectionKind;
  createdAt: string;
  periodStart?: string;
  periodEnd?: string;
  itemId?: string;
  decisionId?: string;
  promptKey?: string;
}
