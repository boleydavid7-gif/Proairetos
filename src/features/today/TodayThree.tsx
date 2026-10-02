import { tap } from '../../app/feel';
import { useSheet } from '../../components/ui/useSheet';
import { useEffect, useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService } from '../../app/services';
import { MAX_TODAY_PICKS } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';
import { CheckIcon, ChevronRightIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import EnergyChoice, { useEnergy } from './EnergyChoice';
import { useServiceData } from '../../app/hooks/useServiceData';

/** The names of the values the person linked to an item, for showing beside it. */
function useValueNames(): ReadonlyMap<string, string> {
  const values = useServiceData(compassService.subscribe, () => compassService.values()) ?? [];
  return new Map(values.map((value) => [value.id, value.name]));
}

const linkedValues = (item: LifeItem, names: ReadonlyMap<string, string>) =>
  (item.valueIds ?? []).map((id) => names.get(id)).filter((name): name is string => Boolean(name));

type Props = {
  date: string;
  items: LifeItem[];
};

const isOpen = (item: LifeItem) => item.status === 'OPEN' || item.status === 'WAITING';

function Picker({ date, items, onClose }: Props & { onClose: () => void }) {
  const { dialog, panel } = useSheet();
  const energy = useEnergy(date);
  const names = useValueNames();
  const [error, setError] = useState('');
  // Shows a tap at once; the saved value takes over when it arrives.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // Done picks still hold their place in the three, so they are listed (and can be unpicked) too.
  const open = items
    .filter((item) => isOpen(item) || (item.status === 'DONE' && item.pickedFor === date))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    // When the person says energy is low, what they marked as light comes first. Nothing else is reordered.
    .sort((a, b) => (energy === 'low' || energy === 'some' ? Number(Boolean(b.light)) - Number(Boolean(a.light)) : 0));
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
          Up to three things from your list to walk through today. They sit on Today until the day ends; nothing carries
          over.
        </p>
        <p className="sheet__status">
          {pickedCount} of {MAX_TODAY_PICKS} chosen. You decide; nothing is suggested.
        </p>
        <EnergyChoice date={date} />
        {open.length === 0 && <p className="empty-note">Nothing open yet. Capture something first.</p>}
        {[
          {
            id: 'planned',
            label: 'Planned for today',
            list: open.filter((item) => item.plannedFor === date),
          },
          {
            id: 'rest',
            label: 'Everything else',
            list: open.filter((item) => item.plannedFor !== date),
          },
        ]
          .filter((group) => group.list.length > 0)
          .map((group, _index, groups) => (
            <div key={group.id} className="pick-group">
              {groups.length > 1 && <p className="sheet__label">{group.label}</p>}
              <ul className="pick-list">
                {group.list.map((item) => {
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
                            setPending((current) => ({
                              ...current,
                              [item.id]: !picked,
                            }));
                            try {
                              await lifeService.pickForDay(item.id, picked ? undefined : date);
                            } catch (cause) {
                              setError(cause instanceof Error ? cause.message : 'Could not choose that.');
                              setPending(({ [item.id]: _failed, ...rest }) => rest);
                            }
                          }}
                        />
                        <span className="pick-row__text">
                          <span>{item.title}</span>
                          {(item.light || linkedValues(item, names).length > 0) && (
                            <span className="pick-row__detail">
                              {[item.light ? 'Takes little energy' : '', ...linkedValues(item, names)]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
  const names = useValueNames();
  const [picking, setPicking] = useState(false);
  const anyOpen = items.some(isOpen);
  const picks = items
    .filter((item) => item.pickedFor === date && (isOpen(item) || item.status === 'DONE'))
    .sort((a, b) => (a.pickedAt ?? '').localeCompare(b.pickedAt ?? ''));

  // With nothing to choose from, the section waits.
  if (!anyOpen && picks.length === 0 && !picking) return null;

  async function toggle(item: LifeItem) {
    const done = item.status === 'DONE';
    if (!done) tap();
    const change = await lifeService.setStatus(item.id, done ? 'OPEN' : 'DONE');
    if (!done) offerUndo(`Done: ${item.title}`, change.undo);
  }

  return (
    <section className="today-section" aria-label="Today’s path">
      <div className="section-heading">
        <h2 className="section-label">Today’s path</h2>
        <span className="section-heading__actions">
          {picks.length === 0 && <NotForMe part="path" />}
          <button type="button" className="text-link" onClick={() => setPicking(true)}>
            {picks.length > 0 ? 'Change' : 'Choose'}
          </button>
        </span>
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
                  {linkedValues(item, names).length > 0 && (
                    <span className="path__detail path__detail--value">For {linkedValues(item, names).join(', ')}</span>
                  )}
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
