import type { RepeatRule } from './repeat';

export type LifeItemType =
  | 'DO'
  | 'REMEMBER'
  | 'MAKE_TIME_FOR'
  | 'THINKING_ABOUT';

/** How something arrived through Capture, as the person tagged it. Only a label; nothing acts on it. */
export type CaptureKind = 'THOUGHT' | 'EMOTION' | 'CONCERN' | 'IDEA';

/** The person's own grouping for Plan. Important is the separate `important` mark. */
export type PlanGroup = 'MAINTENANCE' | 'MEANINGFUL';

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
  captureKind?: CaptureKind;
  planGroup?: PlanGroup;
  /** Local date ("YYYY-MM-DD") planned for, without a time. */
  plannedFor?: string;
  /** A routine: repeats from scheduledAt. */
  repeat?: RepeatRule;
  /** Local date ("YYYY-MM-DD") the person chose this as one of up to three for that day. */
  pickedFor?: string;
  /** When it was picked, so the three keep the order they were chosen in. */
  pickedAt?: string;
  createdAt: string;
  updatedAt: string;
}
