import type { LifeService } from '../../services/life/lifeService';
import type { NowViewModel } from './types';
import { buildNowViewModel } from './nowViewModel';

export function createNowController(life: Pick<LifeService, 'list'>) {
  return {
    async getViewModel(now: Date = new Date()): Promise<NowViewModel> {
      return buildNowViewModel(await life.list(), now);
    },
  };
}
