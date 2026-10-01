import { createContext, useContext } from 'react';
import type { Undo } from '../../services/life/lifeService';

export type Overlays = {
  openItem: (id: string) => void;
  /** Shows a short confirmation with an undo button. */
  offerUndo: (message: string, undo: Undo) => void;
};

export const OverlayContext = createContext<Overlays | null>(null);

export function useOverlays(): Overlays {
  const overlays = useContext(OverlayContext);
  if (!overlays) throw new Error('useOverlays must be used inside OverlayProvider.');
  return overlays;
}
