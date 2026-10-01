import type { LifeItem } from '../../core/life-items/types';
import type { NowViewModel } from './types';
import { buildNowViewModel } from './nowViewModel';

export type LifeItemSource = () => LifeItem[];

// No storage is wired yet; Now renders its empty state until it is.
const emptySource: LifeItemSource = () => [];

export function createNowController(source: LifeItemSource = emptySource) {
  return {
    getViewModel(now: Date = new Date()): NowViewModel {
      return buildNowViewModel(source(), now);
    },
  };
}

export const nowController = createNowController();
