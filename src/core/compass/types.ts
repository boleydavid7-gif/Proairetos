/**
 * PERSON: someone who matters to the person; the body is their name.
 * GOAL: something they are working toward, in their own words.
 */
export type CompassStatementType = 'REMEMBER' | 'PUSHED_ASIDE' | 'PERSON' | 'GOAL';

export interface CompassStatement {
  id: string;
  userId: string;
  type: CompassStatementType;
  body: string;
  createdAt: string;
  /** For a person: a line in the person's own words, e.g. why they matter. */
  note?: string;
  /** For a person: when the person last chose to note they were in touch. A record, never a reminder. */
  inTouchAt?: string;
  /** For a goal: when the person said it was reached. Their mark; the app never decides it. */
  reachedAt?: string;
}

export const MAX_PEOPLE = 20;

/** A few at a time keeps them in view. */
export const MAX_GOALS = 5;

export const MAX_STATEMENT_LENGTH = 280;
