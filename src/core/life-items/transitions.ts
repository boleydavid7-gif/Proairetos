import type { LifeItemStatus } from './types';

const allowedTransitions: Record<LifeItemStatus, LifeItemStatus[]> = {
  OPEN: ['WAITING', 'DONE', 'LET_GO'],
  WAITING: ['OPEN', 'DONE', 'LET_GO'],
  DONE: ['OPEN'],
  LET_GO: ['OPEN'],
};

export function canTransition(
  from: LifeItemStatus,
  to: LifeItemStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}
