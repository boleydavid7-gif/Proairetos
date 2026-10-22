import { useEffect, useRef, useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService, scheduleService } from '../../app/services';
import { onRemoteChanges } from '../../app/sync/syncController';
import { isAdded } from '../../app/family/added';
import { useSheet } from '../../components/ui/useSheet';
import { parseLocalDate } from '../../core/scheduling/dates';
import type { Clash } from '../../app/family/trainingClash';

const clock = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const dayName = (date: string) => parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'long' });
const what = (clash: Clash) => (clash.session.app === 'askesis' ? 'run' : 'strength session');

/**
 * Watches for a timed thing being set or moved in Proairetos and, when it lands on a planned run or strength session,
 * offers once to keep the session: at another time that day, on another day the training week allows, or as it is.
 * Changes that arrive by sync are not offered (they were set elsewhere).
 */
export default function TrainingClash() {
  const [clash, setClash] = useState<Clash>();
  const seen = useRef<Map<string, string> | undefined>(undefined);
  const remoteAt = useRef(0);

  useEffect(() => {
    if (!isAdded('askesis') && !isAdded('dynamis')) return;
    let live = true;
    const key = (item: { scheduledAt?: string; endsAt?: string }) => `${item.scheduledAt ?? ''}|${item.endsAt ?? ''}`;
    void lifeService.list().then((items) => {
      seen.current = new Map(items.map((item) => [item.id, key(item)]));
    });
    const check = async () => {
      const before = seen.current;
      if (!before) return;
      const items = await lifeService.list();
      const changed = items.filter((item) => item.scheduledAt && before.get(item.id) !== key(item));
      seen.current = new Map(items.map((item) => [item.id, key(item)]));
      if (!changed.length || Date.now() - remoteAt.current < 3000) return;
      const { clashFor } = await import('../../app/family/trainingClash');
      for (const item of changed) {
        const found = await clashFor(item).catch(() => undefined);
        if (found && live) {
          setClash(found);
          return;
        }
      }
    };
    // The schedule: offered only for sessions that work or protected time newly crowds out.
    let known: Set<string> | undefined;
    const scheduleClashes = async () => (await import('../../app/family/trainingClash')).scheduleClashes().catch(() => []);
    void scheduleClashes().then((found) => {
      known = new Set(found.map((each) => each.key));
    });
    let timer: number | undefined;
    const checkSchedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const found = await scheduleClashes();
        const before = known;
        known = new Set(found.map((each) => each.key));
        if (!before || Date.now() - remoteAt.current < 3000) return;
        const fresh = found.find((each) => !before.has(each.key));
        if (fresh && live) setClash(fresh);
      }, 500);
    };
    const offSchedule = scheduleService.subscribe(checkSchedule);
    const off = lifeService.subscribe(() => void check());
    const offRemote = onRemoteChanges(() => {
      remoteAt.current = Date.now();
    });
    return () => {
      live = false;
      off();
      offSchedule();
      window.clearTimeout(timer);
      offRemote();
    };
  }, []);

  return clash ? <ClashSheet clash={clash} onClose={() => setClash(undefined)} /> : null;
}

function ClashSheet({ clash, onClose }: { clash: Clash; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const { session } = clash;
  const span = session.at ? `${clock(session.at)}–${clock(new Date(session.at.getTime() + session.minutes * 60_000))}` : `${session.minutes} min`;

  const pick = async (choice: { kind: 'time'; at: Date } | { kind: 'day'; date: string }) => {
    const { keepAtTime, keepOffDay } = await import('../../app/family/trainingClash');
    if (choice.kind === 'time') {
      const undo = keepAtTime(session, choice.at);
      offerUndo(`${session.title} at ${clock(choice.at)}`, async () => undo());
    } else {
      const undo = keepOffDay(session);
      offerUndo(`${session.title} moved to ${dayName(choice.date)}`, async () => undo());
    }
    close();
  };

  return (
    <dialog ref={dialog} className="sheet" aria-label="Keep your training" onClose={onClose} onClick={(event) => event.target === dialog.current && close()}>
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">Your {what(clash)} and “{clash.item.title}”</p>
        <p className="sheet__hint">
          {dayName(session.date)}: {session.title}, {span}.{' '}
          {session.at ? 'They overlap.' : 'There is no stretch left in the day that holds it.'}
        </p>
        <div className="clash-choices">
 {clash.times.map((at, index) => (
            <button key={at.getTime()} type="button" className={index === 0 ? 'button-accent' : 'button-quiet'} onClick={() => void pick({ kind: 'time', at })}>
              {clash.session.app === 'askesis' ? 'Run' : 'Train'} at {clock(at)}
            </button>
          ))}
          {clash.day && (
            <button type="button" className={clash.times.length ? 'button-quiet' : 'button-accent'} onClick={() => void pick({ kind: 'day', date: clash.day! })}>
              Move it to {dayName(clash.day)}
            </button>
          )}
          <button type="button" className="text-link" onClick={close}>
            Keep both as they are
          </button>
        </div>
      </div>
    </dialog>
  );
}
