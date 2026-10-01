export interface ReflectionModel {
  id: string;
  userId: string;
  body: string;
  kind: 'FREE' | 'REVIEW' | 'DECISION_FOLLOWUP';
  createdAt: string;
  periodStart?: string;
  periodEnd?: string;
  itemId?: string;
  decisionId?: string;
  promptKey?: string;
}
