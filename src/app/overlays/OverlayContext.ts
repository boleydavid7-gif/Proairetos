import { createContext, useContext } from 'react';
import type { FocusSession } from '../../core/focus/session';
import type { Undo } from '../../services/life/lifeService';

export type FocusTarget = { id: string; title: string };

export type Overlays = {
  openItem: (id: string) => void;
  /** Shows a short confirmation with an undo button. */
  offerUndo: (message: string, undo: Undo) => void;
  /** Opens the focus starter, optionally for an item. */
  startFocus: (target?: FocusTarget) => void;
  focusSession: FocusSession | null;
  openFocus: () => void;
  /** The one-minute arrival moment. */
  openPause: () => void;
};

export const OverlayContext = createContext<Overlays | null>(null);

export function useOverlays(): Overlays {
  const overlays = useContext(OverlayContext);
  if (!overlays) throw new Error('useOverlays must be used inside OverlayProvider.');
  return overlays;
}
