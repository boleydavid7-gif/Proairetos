import { useSheet } from '../../components/ui/useSheet';
import { useEffect, useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { MAX_TODAY_PICKS } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';
import { ChevronRightIcon } from '../../components/icons/Icons';

type Props = {
  date: string;
  items: LifeItem[];
};

const isOpen = (item: LifeItem) => item.status === 'OPEN' || item.status === 'WAITING';

function Picker({ date, items, onClose }: Props & { onClose: () => void }) {
  const { dialog, panel } = useSheet();
  const [error, setError] = useState('');
  // Shows a tap at once; the saved value takes over when it arrives.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const open = items
    .filter(isOpen)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const isPicked = (item: LifeItem) => pending[item.id] ?? item.pickedFor === date;

  // Drop a pending tap once the saved data agrees with it.
  useEffect(() => {
    setPending((current) => {
      const stillPending = Object.entries(current).filter(([id, picked]) => {
        const item = items.find((candidate) => candidate.id === id);
        return item && (item.pickedFor === date) !== picked;
      });
      return stillPending.length === Object.keys(current).length ? current : Object.fromEntries(stillPending);
    });
  }, [items, date]);
  const pickedCount = open.filter(isPicked).length;


  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Today's three"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Done
        </button>
        <p className="sheet__title sheet__title--static">Today's three</p>
        <p className="sheet__hint">
          Things from your list you want to keep in front of you today. They sit near the top of Today until the day
          ends; nothing carries over.
        </p>
        <p className="sheet__status">
          {pickedCount} of {MAX_TODAY_PICKS} chosen. You decide; nothing is suggested.
        </p>
        {open.length === 0 && <p className="empty-note">Nothing open yet. Capture something first.</p>}
        <ul className="pick-list">
          {open.map((item) => {
            const picked = isPicked(item);
            return (
              <li key={item.id}>
                <label className="pick-row">
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={!picked && pickedCount >= MAX_TODAY_PICKS}
                    onChange={async () => {
                      setError('');
                      setPending((current) => ({ ...current, [item.id]: !picked }));
                      try {
                        await lifeService.pickForDay(item.id, picked ? undefined : date);
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'Could not choose that.');
                        setPending(({ [item.id]: _failed, ...rest }) => rest);
                      }
                    }}
                  />
                  <span>{item.title}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {error && <p className="form-error">{error}</p>}
      </div>
    </dialog>
  );
}

/** The person's own up-to-three for today. Unchosen days stay quiet; nothing carries over as a debt. */
export default function TodayThree({ date, items }: Props) {
  const { openItem } = useOverlays();
  const [picking, setPicking] = useState(false);
  const anyOpen = items.some(isOpen);
  const picks = items
    .filter((item) => item.pickedFor === date && isOpen(item))
    .sort((a, b) => (a.pickedAt ?? '').localeCompare(b.pickedAt ?? ''));

  // With nothing captured there is nothing to choose from, so the section waits.
  if (!anyOpen && !picking) return null;

  return (
    <section className="stack-tight" aria-label="Today's three">
      {picks.length > 0 ? (
        <>
          <div className="section-heading">
            <h2 className="section-label">Today's three</h2>
            <button type="button" className="text-link" onClick={() => setPicking(true)}>
              Change
            </button>
          </div>
          <ol className="three-list">
            {picks.map((item) => (
              <li key={item.id}>
                <button type="button" className="three-item" onClick={() => openItem(item.id)}>
                  <span className="three-item__title">{item.title}</span>
                  {item.nextStep && <span className="three-item__step">Next: {item.nextStep}</span>}
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <button type="button" className="list-card list-card--button" onClick={() => setPicking(true)}>
          <span className="list-card__text">
            <span className="list-card__title">Today's three</span>
            <span className="list-card__detail list-card__detail--full">
              Pick up to three things from your list to keep in front of you today. Optional.
            </span>
          </span>
          <ChevronRightIcon size={18} className="list-card__chevron" />
        </button>
      )}
      {picking && <Picker date={date} items={items} onClose={() => setPicking(false)} />}
    </section>
  );
}
