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
  createdAt: string;
  updatedAt: string;
}
