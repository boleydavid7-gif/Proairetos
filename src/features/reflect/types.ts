export type ReflectionMode =
  | 'free'
  | 'review'
  | 'decision_followup';

export interface ReflectionContext {
  itemId?: string;
  decisionId?: string;
  periodStart?: string;
  periodEnd?: string;
}
