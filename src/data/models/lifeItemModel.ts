import type { LifeItemStatus, LifeItemType } from '../../core/life-items/types';

export interface LifeItemModel {
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
  createdAt: string;
  updatedAt: string;
}
