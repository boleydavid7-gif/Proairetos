import { useServiceData } from '../../../app/hooks/useServiceData';
import { lifeService } from '../../../app/services';
import { createNowController } from '../nowController';

const controller = createNowController(lifeService);

export function useNow() {
  return useServiceData(lifeService.subscribe, () => controller.getViewModel());
}
