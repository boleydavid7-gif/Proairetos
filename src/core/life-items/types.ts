import type { RepeatRule } from './repeat';

export type LifeItemType =
  | 'DO'
  | 'REMEMBER'
  | 'MAKE_TIME_FOR'
  | 'THINKING_ABOUT';

export type LifeItemStatus =
  | 'OPEN'
  | 'WAITING'
  | 'DONE'
  | 'LET_GO';

export type LifeItemSource =
  | 'MANUAL'
  | 'CAPTURE'
  | 'CALENDAR'
  | 'IMPORT'
  | 'ASSISTANT_CONFIRMED';

/**
 * The Stoic dichotomy of control, written by the person for a Thinking
 * about item: what they can act on, and what they cannot.
 */
export interface ControlSplit {
  inMyControl: string[];
  notInMyControl: string[];
}

export interface LifeItem {
  id: string;
  userId: string;
  type: LifeItemType | null;
  title: string;
  notes?: string;
  status: LifeItemStatus;
  important: boolean;
  scheduledAt?: string;
  checkBackAt?: string;
  source: LifeItemSource;
  carried: boolean;
  /** Values the person chose to connect. Always optional. */
  valueIds?: string[];
  controlSplit?: ControlSplit;
  /** The very next small, concrete action, in the person's words. */
  nextStep?: string;
  /** When or where the next step will happen: the cue of an implementation intention. */
  nextStepCue?: string;
  /** "If something gets in the way, I will...", the person's own plan. */
  ifObstacle?: string;
  /** A routine: repeats from scheduledAt. */
  repeat?: RepeatRule;
  /** Local date ("YYYY-MM-DD") the person chose this as one of up to three for that day. */
  pickedFor?: string;
  createdAt: string;
  updatedAt: string;
}
