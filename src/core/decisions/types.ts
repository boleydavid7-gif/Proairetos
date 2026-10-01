/**
 * A choice the person made, kept so they can learn from it later.
 * Flow: Thinking about -> Decision -> Reflection.
 */
export interface Decision {
  id: string;
  userId: string;
  /** The Thinking about item this came from, if any. */
  lifeItemId?: string;
  question: string;
  options: string[];
  /** The chosen option, in the person's words. */
  choice: string;
  /** Why, if they want to remember. */
  reasons?: string;
  decidedAt: string;
  /** What the person expects to happen, written before the outcome is known. */
  expected?: string;
  confidence?: DecisionConfidence;
  /** When they want to look at it again. */
  revisitAt?: string;
  /** Set once they have looked back and are done revisiting. */
  revisitedAt?: string;
  /** Looking back, the choice and its outcome are judged separately, so luck is not mistaken for judgment. */
  lookBack?: DecisionLookBack;
}

export type DecisionConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type DecisionProcess = 'AGAIN' | 'PARTLY' | 'DIFFERENTLY';
export type DecisionOutcome = 'BETTER' | 'AS_EXPECTED' | 'NOT_AS_HOPED' | 'TOO_SOON';

export interface DecisionLookBack {
  process: DecisionProcess;
  outcome: DecisionOutcome;
  at: string;
}

export const confidenceLabels: Record<DecisionConfidence, string> = {
  LOW: 'Not sure',
  MEDIUM: 'Fairly sure',
  HIGH: 'Very sure',
};

export const processLabels: Record<DecisionProcess, string> = {
  AGAIN: 'I would make it again',
  PARTLY: 'Partly',
  DIFFERENTLY: 'I would choose differently',
};

export const outcomeLabels: Record<DecisionOutcome, string> = {
  BETTER: 'Better than expected',
  AS_EXPECTED: 'About as expected',
  NOT_AS_HOPED: 'Not as hoped',
  TOO_SOON: 'Too soon to tell',
};

export const MAX_DECISION_OPTIONS = 8;
export const MAX_DECISION_TEXT = 280;
