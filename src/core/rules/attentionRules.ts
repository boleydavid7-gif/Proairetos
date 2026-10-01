import type { LifeItem } from '../domain/types';

export function isVisibleInNow(item: LifeItem): boolean {
  return Boolean(item.important || item.scheduledAt || item.status === 'waiting');
}
