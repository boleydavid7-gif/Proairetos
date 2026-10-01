export const LifeItemTypes = {
  DO: 'DO',
  REMEMBER: 'REMEMBER',
  MAKE_TIME_FOR: 'MAKE_TIME_FOR',
  THINKING_ABOUT: 'THINKING_ABOUT',
} as const;

export type LifeItemType = typeof LifeItemTypes[keyof typeof LifeItemTypes];

export const LifeItemStatuses = {
  OPEN: 'OPEN',
  WAITING: 'WAITING',
  DONE: 'DONE',
  LET_GO: 'LET_GO',
} as const;

export type LifeItemStatus = typeof LifeItemStatuses[keyof typeof LifeItemStatuses];

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
  carried: boolean;
}
