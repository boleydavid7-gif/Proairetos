import { useSheet } from '../../components/ui/useSheet';
import { useEffect, useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { MAX_TODAY_PICKS } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';
import { CheckIcon, ChevronRightIcon } from '../../components/icons/Icons';

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
  // Done picks still hold their place in the three, so they are listed (and can be unpicked) too.
  const open = items
    .filter((item) => isOpen(item) || (item.status === 'DONE' && item.pickedFor === date))
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
      aria-label="Today’s path"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Done
        </button>
        <p className="sheet__title sheet__title--static">Today’s path</p>
        <p className="sheet__hint">
          Up to three things from your list to walk through today. They sit on Today until the day ends; nothing
          carries over.
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

/**
 * Today’s path: the person's own up to three for the day, as a short path of
 * circles. Checking one closes it with an undo; nothing carries over as a debt.
 */
export default function TodayThree({ date, items }: Props) {
  const { openItem, offerUndo } = useOverlays();
  const [picking, setPicking] = useState(false);
  const anyOpen = items.some(isOpen);
  const picks = items
    .filter((item) => item.pickedFor === date && (isOpen(item) || item.status === 'DONE'))
    .sort((a, b) => (a.pickedAt ?? '').localeCompare(b.pickedAt ?? ''));

  // With nothing to choose from, the section waits.
  if (!anyOpen && picks.length === 0 && !picking) return null;

  async function toggle(item: LifeItem) {
    const done = item.status === 'DONE';
    const change = await lifeService.setStatus(item.id, done ? 'OPEN' : 'DONE');
    if (!done) offerUndo(`Done: ${item.title}`, change.undo);
  }

  return (
    <section className="today-section" aria-label="Today’s path">
      <div className="section-heading">
        <h2 className="section-label">Today’s path</h2>
        <button type="button" className="text-link" onClick={() => setPicking(true)}>
          {picks.length > 0 ? 'Change' : 'Choose'}
        </button>
      </div>
      {picks.length > 0 ? (
        <ol className="path">
          {picks.map((item) => {
            const done = item.status === 'DONE';
            return (
              <li key={item.id} className={`path__step${done ? ' path__step--done' : ''}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={item.title}
                  className="path__circle"
                  onClick={() => toggle(item)}
                >
                  {done && <CheckIcon size={14} />}
                </button>
                <button type="button" className="path__text" onClick={() => openItem(item.id)}>
                  <span className="path__title">{item.title}</span>
                  {item.nextStep && !done && <span className="path__detail">Next: {item.nextStep}</span>}
                </button>
                <ChevronRightIcon size={16} className="path__chevron" />
              </li>
            );
          })}
        </ol>
      ) : (
        <button type="button" className="path-empty" onClick={() => setPicking(true)}>
          Pick up to three things from your list to walk through today. Optional.
        </button>
      )}
      {picking && <Picker date={date} items={items} onClose={() => setPicking(false)} />}
    </section>
  );
}
