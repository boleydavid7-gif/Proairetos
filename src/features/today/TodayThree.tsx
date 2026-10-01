import { useEffect, useRef, useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { MAX_TODAY_PICKS } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';

type Props = {
  date: string;
  items: LifeItem[];
};

function Picker({ date, items, onClose }: Props & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  // Shows a tap at once; the saved value takes over when it arrives.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const open = items
    .filter((item) => item.status === 'OPEN' || item.status === 'WAITING')
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

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Choose up to three"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Done
        </button>
        <p className="sheet__title sheet__title--static">Up to three for today</p>
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
  const picks = items.filter((item) => item.pickedFor === date && (item.status === 'OPEN' || item.status === 'WAITING'));

  return (
    <section className="stack-tight" aria-label="Your three for today">
      {picks.length > 0 ? (
        <>
          <div className="section-heading">
            <h2 className="section-label">Your three for today</h2>
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
        <button type="button" className="chip chip--wide" onClick={() => setPicking(true)}>
          Choose up to three for today
        </button>
      )}
      {picking && <Picker date={date} items={items} onClose={() => setPicking(false)} />}
    </section>
  );
}
