import { useCallback, useMemo, useState, type ReactNode } from 'react';
import ItemSheet from '../../features/items/ItemSheet';
import type { Undo } from '../../services/life/lifeService';
import { OverlayContext } from './OverlayContext';
import UndoToast from './UndoToast';

type Toast = { id: number; message: string; undo: Undo };

export default function OverlayProvider({ children }: { children: ReactNode }) {
  const [itemId, setItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const offerUndo = useCallback((message: string, undo: Undo) => {
    setToast({ id: Date.now(), message, undo });
  }, []);

  const overlays = useMemo(() => ({ openItem: setItemId, offerUndo }), [offerUndo]);

  return (
    <OverlayContext.Provider value={overlays}>
      {children}
      {itemId && <ItemSheet itemId={itemId} onClose={() => setItemId(null)} />}
      {toast && (
        <UndoToast
          key={toast.id}
          message={toast.message}
          onUndo={() => {
            toast.undo();
            setToast(null);
          }}
          onDismiss={() => setToast(null)}
        />
      )}
    </OverlayContext.Provider>
  );
}
