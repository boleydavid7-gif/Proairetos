import type { NowItemReason } from '../../core/now/types';

export type NowItem = {
  id: string;
  title: string;
  reasons: NowItemReason[];
  scheduledAt?: string;
  checkBackAt?: string;
  nextStep?: string;
};

export type NowViewModel = {
  nextCommitment: NowItem | null;
  scheduled: NowItem[];
  important: NowItem[];
  waiting: NowItem[];
  unsortedCount: number;
  isEmpty: boolean;
};
