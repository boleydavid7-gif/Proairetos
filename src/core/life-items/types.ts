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
  createdAt: string;
  updatedAt: string;
}
