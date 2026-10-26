import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import { itemFacts } from '../../core/life-items/facts';
import { itemKinds, kindOf } from '../../core/life-items/kinds';
import type { LifeItem } from '../../core/life-items/types';
import { addDays } from '../../core/scheduling/dates';

/** What can be sorted: open, not a routine, and not already set for today. */
export function sortable(items: readonly LifeItem[], today: string, unsortedFirst = false): LifeItem[] {
  return items
    .filter((item) => item.status === 'OPEN' && !item.repeat && item.plannedFor !== today && item.pickedFor !== today)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .sort((a, b) => (unsortedFirst ? Number(kindOf(a) !== undefined) - Number(kindOf(b) !== undefined) : 0));
}

/**
 * Sort through: one thing at a time, with the facts beside it, and three
 * plain choices. The person decides; the app only shows what they marked
 * and when things arrived. Leaving part way is fine; nothing is owed.
 */
export default function QuickSortSheet({
  items,
  today,
  unsortedFirst = false,
  onClose,
}: {
  items: readonly LifeItem[];
  today: string;
  /** From a "not sorted" prompt: things without a kind come first. */
  unsortedFirst?: boolean;
  onClose: () => void;
}) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  // The list is fixed when the sheet opens, so choices do not reshuffle it.
  const [queue] = useState(() => sortable(items, today, unsortedFirst).map((item) => item.id));
  const [handled, setHandled] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [scheduleChoice, setScheduleChoice] = useState<'today' | 'later' | null>(null);
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduleTime, setScheduleTime] = useState('');
  const values = useServiceData(compassService.subscribe, () => compassService.values()) ?? [];
  const names = new Map(values.map((value) => [value.id, value.name]));
  // Skips anything deleted meanwhile.
  const current = queue
    .filter((id) => !handled.includes(id))
    .map((id) => items.find((item) => item.id === id))
    .find((item) => item !== undefined);

  async function choose(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      if (current) setHandled([...handled, current.id]);
    }
  }

  function startScheduling(choice: 'today' | 'later') {
    setScheduleChoice(choice);
    setScheduleDate(choice === 'today' ? today : addDays(today, 1));
    setScheduleTime('');
  }

  async function saveSchedule() {
    if (!current || !scheduleDate) return;
    const item = current;
    setBusy(true);
    try {
      if (scheduleTime) {
        // A local date/time input becomes the same instant in the user's local timezone.
        await lifeService.setPlannedFor(item.id, undefined);
        await lifeService.schedule(item.id, new Date(`${scheduleDate}T${scheduleTime}`).toISOString());
      } else {
        await lifeService.setPlannedFor(item.id, scheduleDate);
      }
      setScheduleChoice(null);
      setHandled([...handled, item.id]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Sort through"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          {current ? 'Stop here' : 'Close'}
        </button>
        <p className="sheet__title sheet__title--static">Sort through</p>

        {current ? (
          <>
            <p className="sheet__hint">One at a time.</p>
            <div className="sort-card">
              <p className="sort-card__title">{current.title}</p>
              <div className="chip-row" role="group" aria-label="Kind">
                {itemKinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    className="chip chip--small"
                    aria-pressed={kindOf(current) === kind.id}
                    onClick={() => lifeService.setKind(current.id, kindOf(current) === kind.id ? undefined : kind.id)}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <ul className="sort-card__facts">
                {itemFacts(current, today, names).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            {scheduleChoice ? (
              <div className="sort-when" aria-label="Choose when">
                <button type="button" className="text-link sort-when__back" disabled={busy} onClick={() => setScheduleChoice(null)}>
                  ← Back to choices
                </button>
                <p className="sort-when__title">When?</p>
                <div className="sort-when__fields">
                  <label>
                    <span>Date</span>
                    <input type="date" value={scheduleDate} min={today} onChange={(event) => setScheduleDate(event.target.value)} />
                  </label>
                  <label>
                    <span>Time <small>(optional)</small></span>
                    <input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
                  </label>
                </div>
                <p className="sort-when__hint">Add a time for appointments or anything that must happen at a specific hour.</p>
                <button type="button" className="button-main sort-when__save" disabled={busy || !scheduleDate} onClick={() => void saveSchedule()}>
                  {scheduleTime ? 'Schedule' : 'Set date'}
                </button>
              </div>
            ) : (
              <div className="sort-choices">
                <button type="button" className="chip chip--accent" disabled={busy} onClick={() => startScheduling('today')}>
                  Today
                </button>
                <button type="button" className="chip" disabled={busy} onClick={() => startScheduling('later')}>
                  Later
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() =>
                    choose(async () => {
                      const change = await lifeService.setStatus(current.id, 'LET_GO');
                      offerUndo(`“${current.title}” let go`, change.undo);
                    })
                  }
                >
                  Let go
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() =>
                    choose(async () => {
                      const change = await lifeService.setStatus(current.id, 'DONE');
                      offerUndo(`“${current.title}” done`, change.undo);
                    })
                  }
                >
                  Already done
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">That’s everything for now</p>
            <p className="empty-state__detail">What you chose for today is in Days ahead.</p>
          </div>
        )}
      </div>
    </dialog>
  );
}
