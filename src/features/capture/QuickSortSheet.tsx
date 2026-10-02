import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import { itemFacts } from '../../core/life-items/facts';
import type { LifeItem } from '../../core/life-items/types';

/** What can be sorted: open, not a routine, and not already set for today. */
export function sortable(items: readonly LifeItem[], today: string): LifeItem[] {
  return items
    .filter((item) => item.status === 'OPEN' && !item.repeat && item.plannedFor !== today && item.pickedFor !== today)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Sort through: one thing at a time, with the facts beside it, and three
 * plain choices. The person decides; the app only shows what they marked
 * and when things arrived. Leaving part way is fine; nothing is owed.
 */
export default function QuickSortSheet({ items, today, onClose }: { items: readonly LifeItem[]; today: string; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  // The list is fixed when the sheet opens, so choices do not reshuffle it.
  const [queue] = useState(() => sortable(items, today).map((item) => item.id));
  const [handled, setHandled] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
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
            <p className="sheet__hint">One at a time. Today, later, or let it go. Stop whenever you like.</p>
            <div className="sort-card">
              <p className="sort-card__title">{current.title}</p>
              <ul className="sort-card__facts">
                {itemFacts(current, today, names).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div className="sort-choices">
              <button
                type="button"
                className="chip chip--accent"
                disabled={busy}
                onClick={() => choose(() => lifeService.setPlannedFor(current.id, today))}
              >
                Today
              </button>
              <button type="button" className="chip" disabled={busy} onClick={() => choose(async () => undefined)}>
                Later
              </button>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() =>
                  choose(async () => {
                    const change = await lifeService.setStatus(current.id, 'LET_GO');
                    offerUndo(`Let go: ${current.title}`, change.undo);
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
                    offerUndo(`Done: ${current.title}`, change.undo);
                  })
                }
              >
                Already done
              </button>
            </div>
            <p className="sheet__hint">Later keeps it on your list as it is.</p>
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">That’s everything for now.</p>
            <p className="empty-state__detail">What you chose for today is on Plan.</p>
          </div>
        )}
      </div>
    </dialog>
  );
}
