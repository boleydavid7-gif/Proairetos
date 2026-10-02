import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { focusedMinutes, pause, resume, startSession, type FocusSession } from '../../core/focus/session';
import { loadFocusSession, saveFocusSession } from '../../data/storage/preferences';
import DecideSheet, { type DecideFrom } from '../../features/decisions/DecideSheet';
import DecisionSheet from '../../features/decisions/DecisionSheet';
import FocusBar from '../../features/focus/FocusBar';
import FocusScreen from '../../features/focus/FocusScreen';
import FocusStart from '../../features/focus/FocusStart';
import ItemSheet from '../../features/items/ItemSheet';
import PauseScreen from '../../features/pause/PauseScreen';
import PracticeScreen from '../../features/pause/PracticeScreen';
import SupportScreen from '../../features/support/SupportScreen';
import type { PracticeId } from '../../core/practices/practices';
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
  // undefined: closed; null: the list; an id: that practice.
  const [practice, setPractice] = useState<PracticeId | null | undefined>(undefined);
  const [support, setSupport] = useState(false);
  const [deciding, setDeciding] = useState<{ from?: DecideFrom } | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);

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

  const finishFocus = useCallback((leftOff?: string) => {
    if (session?.itemId) {
      const minutes = focusedMinutes(session, Date.now());
      if (minutes >= 1) lifeService.recordFocus(session.itemId, minutes).catch(() => undefined);
      if (leftOff?.trim()) lifeService.setNextStep(session.itemId, leftOff).catch(() => undefined);
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
      openPractice: (id?: PracticeId) => setPractice(id ?? null),
      openSupport: () => setSupport(true),
      startDecision: (from?: DecideFrom) => {
        setItemId(null);
        setDeciding({ from });
      },
      openDecision: (id: string) => {
        setItemId(null);
        setDecisionId(id);
      },
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
          onStop={(leftOff) => finishFocus(leftOff)}
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

      {pausing && (
        <PauseScreen
          onClose={() => setPausing(false)}
          onAnotherWay={() => {
            setPausing(false);
            setPractice(null);
          }}
        />
      )}
      {practice !== undefined && (
        <PracticeScreen
          key={practice ?? 'list'}
          practiceId={practice ?? undefined}
          onClose={() => setPractice(undefined)}
          onSupport={() => setSupport(true)}
        />
      )}
      {support && <SupportScreen onClose={() => setSupport(false)} />}

      {deciding && (
        <DecideSheet from={deciding.from} onClose={() => setDeciding(null)} onDecided={(id) => setDecisionId(id)} />
      )}
      {decisionId && !deciding && <DecisionSheet decisionId={decisionId} onClose={() => setDecisionId(null)} />}

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
