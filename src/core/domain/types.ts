export type LifeItemType =
  | 'do'
  | 'remember'
  | 'make_time_for'
  | 'thinking_about'
  | 'decision'
  | null;

export type LifeItemStatus =
  | 'open'
  | 'waiting'
  | 'done'
  | 'let_go';

export type LifeItem = {
  id: string;
  title: string;
  type: LifeItemType;
  status: LifeItemStatus;
  important: boolean;
  scheduledAt?: string;
};

export type CompassValue = {
  id: string;
  name: string;
};
