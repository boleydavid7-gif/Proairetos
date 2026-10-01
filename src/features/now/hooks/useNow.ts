import { useMemo } from 'react';
import { nowController } from '../nowController';

export function useNow() {
  return useMemo(() => nowController.getViewModel(), []);
}
