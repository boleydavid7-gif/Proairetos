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
  /** When they want to look at it again. */
  revisitAt?: string;
  /** Set once they have looked back and are done revisiting. */
  revisitedAt?: string;
}

export const MAX_DECISION_OPTIONS = 8;
export const MAX_DECISION_TEXT = 280;
