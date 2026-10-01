import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { focusedMinutes, pause, resume, startSession, type FocusSession } from '../../core/focus/session';
import { loadFocusSession, saveFocusSession } from '../../data/storage/preferences';
import FocusBar from '../../features/focus/FocusBar';
import FocusScreen from '../../features/focus/FocusScreen';
import FocusStart from '../../features/focus/FocusStart';
import ItemSheet from '../../features/items/ItemSheet';
import PauseScreen from '../../features/pause/PauseScreen';
import type { Undo } from '../../services/life/lifeService';
import { useServiceData } from '../hooks/useServiceData';
import { lifeService } from '../services';
import { OverlayContext, type FocusTarget } from './OverlayContext';
import UndoToast from './UndoToast';

type Toast = { id: number; message: string; undo: Undo };

function useFocusSession() {
  const [session, setSessionState] = useState<FocusSession | null>(() => loadFocusSession<FocusSession>());
  const setSession = useCallback((next: FocusSession | null) => {
    setSessionState(next);
    saveFocusSession(next);
  }, []);
  return [session, setSession] as const;
}

export default function OverlayProvider({ children }: { children: ReactNode }) {
  const [itemId, setItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [focusStart, setFocusStart] = useState<{ target?: FocusTarget } | null>(null);
  const [session, setSession] = useFocusSession();
  // After a reload, a running session comes back as the small bar, not the full screen.
  const [focusVisible, setFocusVisible] = useState(false);
  const [pausing, setPausing] = useState(false);

  const focusItem = useServiceData(
    lifeService.subscribe,
    () => (session?.itemId ? lifeService.get(session.itemId) : Promise.resolve(null)),
    [session?.itemId],
  );

  const offerUndo = useCallback((message: string, undo: Undo) => {
    setToast({ id: Date.now(), message, undo });
  }, []);

  const startFocus = useCallback((target?: FocusTarget) => {
    setItemId(null);
    setFocusStart({ target });
  }, []);

  const finishFocus = useCallback(() => {
    if (session?.itemId) {
      const minutes = focusedMinutes(session, Date.now());
      if (minutes >= 1) lifeService.recordFocus(session.itemId, minutes).catch(() => undefined);
    }
    setSession(null);
    setFocusVisible(false);
  }, [session, setSession]);

  const overlays = useMemo(
    () => ({
      openItem: setItemId,
      offerUndo,
      startFocus,
      focusSession: session,
      openFocus: () => setFocusVisible(true),
      openPause: () => setPausing(true),
    }),
    [offerUndo, startFocus, session],
  );

  return (
    <OverlayContext.Provider value={overlays}>
      {children}
      {itemId && <ItemSheet itemId={itemId} onClose={() => setItemId(null)} />}

      {focusStart && (
        <FocusStart
          target={focusStart.target}
          onClose={() => setFocusStart(null)}
          onStart={(minutes) => {
            const target = focusStart.target;
            setSession(startSession(Date.now(), minutes, target));
            setFocusVisible(true);
          }}
        />
      )}

      {session && focusVisible && (
        <FocusScreen
          session={session}
          nextStep={focusItem?.nextStep}
          onPause={() => setSession(pause(session, Date.now()))}
          onResume={() => setSession(resume(session, Date.now()))}
          onStop={finishFocus}
          onAnother={() => {
            const target = session.itemId ? { id: session.itemId, title: session.itemTitle ?? '' } : undefined;
            finishFocus();
            setSession(startSession(Date.now(), session.durationMs / 60_000, target));
            setFocusVisible(true);
          }}
          onHide={() => setFocusVisible(false)}
        />
      )}
      {session && !focusVisible && <FocusBar session={session} onOpen={() => setFocusVisible(true)} />}

      {pausing && <PauseScreen onClose={() => setPausing(false)} />}

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
