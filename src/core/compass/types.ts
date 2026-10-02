/** PERSON: someone who matters to the person; the body is their name. */
export type CompassStatementType = 'REMEMBER' | 'PUSHED_ASIDE' | 'PERSON';

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
}

export const MAX_PEOPLE = 20;

export const MAX_STATEMENT_LENGTH = 280;
