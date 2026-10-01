import type { LifeItemType } from '../../core/life-items/types';

export const lifeItemTypeLabels: Record<LifeItemType, string> = {
  DO: 'Do',
  REMEMBER: 'Remember',
  MAKE_TIME_FOR: 'Make time for',
  THINKING_ABOUT: 'Thinking about',
};

export const lifeItemTypes = Object.keys(lifeItemTypeLabels) as LifeItemType[];
