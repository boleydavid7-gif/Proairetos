import { useState, useSyncExternalStore } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService, reflectionService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { useSheet } from '../../components/ui/useSheet';
import type { LifeItem } from '../../core/life-items/types';
import { addDays } from '../../core/scheduling/dates';
import { closedDay, setClosedDay, subscribePreferences } from '../../data/storage/preferences';
import { useDoneIn } from './DoneToday';
import { weather } from '../../app/weather/weather';

type Props = {
  today: string;
  range: { start: Date; end: Date };
  items: LifeItem[];
  onClose: () => void;
};

/**
 * A short end to the day: what got done, what (if anything) to carry into
 * tomorrow's path, and a line to set down before resting. Seneca's evening
 * review, kept to under a minute. Nothing here is required.
 */
function CloseDaySheet({ today, range, items, onClose }: Props) {
  const { dialog, panel } = useSheet();
  const { offerUndo } = useOverlays();
  const done = useDoneIn(today, range) ?? [];
  const openPicks = items.filter((item) => item.pickedFor === today && (item.status === 'OPEN' || item.status === 'WAITING'));
  const [carry, setCarry] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const tomorrow = addDays(today, 1);

  async function finish() {
    setBusy(true);
    const carried: string[] = [];
    for (const id of carry) {
      // Tomorrow's path holds three; anything beyond that simply stays on the list.
      await lifeService.pickForDay(id, tomorrow).then(() => carried.push(id), () => undefined);
    }
    const written = note.trim() ? await reflectionService.write({ body: note, promptKey: 'day-close', sky: weather.skyNow() }) : null;
    setClosedDay(today);
    offerUndo('The day is closed. Rest well.', async () => {
      for (const id of carried) await lifeService.pickForDay(id, today).catch(() => undefined);
      if (written) await reflectionService.remove(written.id);
      setClosedDay(null);
    });
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Close the day"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Not now
        </button>
        <p className="sheet__title sheet__title--static">Close the day</p>

        <section className="sheet__section" aria-label="Done">
          <p className="sheet__label">Done</p>
          {done.length > 0 ? (
            <ul className="close-day__done">
              {done.map((entry) => (
                <li key={entry.id}>{entry.title}</li>
              ))}
            </ul>
          ) : (
            <p className="sheet__hint">Nothing had to get done for today to count.</p>
          )}
        </section>

        {openPicks.length > 0 && (
          <section className="sheet__section" aria-label="Carry into tomorrow">
            <p className="sheet__label">Carry into tomorrow’s path?</p>
            <p className="sheet__hint">Only if you want to. Anything left stays on your list, without a mark.</p>
            <div className="chip-row">
              {openPicks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={carry.has(item.id)}
                  onClick={() => {
                    const next = new Set(carry);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    setCarry(next);
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="sheet__section" aria-label="Set down">
          <p className="sheet__label">Anything to set down before you rest?</p>
          <textarea
            className="field-input field-input--area"
            rows={3}
            aria-label="Anything to set down"
            placeholder="Optional. It goes to Reflect."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </section>

        <button type="button" className="button-accent button-accent--wide" disabled={busy} onClick={finish}>
          Close the day
        </button>
      </div>
    </dialog>
  );
}

/** A quiet row near the end of Today, available once the day is winding down. */
export default function CloseDay({
  today,
  range,
  items,
  availableFrom,
  now,
}: Omit<Props, 'onClose'> & { availableFrom: Date; now: Date }) {
  const [open, setOpen] = useState(false);
  // Read live, so an undo, or the day turning over, shows straight away.
  const closed = useSyncExternalStore(subscribePreferences, closedDay) === today;
  if (now.getTime() < availableFrom.getTime() || (closed && !open)) return null;

  return (
    <>
      <button type="button" className="quiet-row" onClick={() => setOpen(true)}>
        <span className="quiet-row__text">
          <span>Close the day</span>
          <span className="quiet-row__detail">A minute to look back and set things down.</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </button>
      {open && (
        <CloseDaySheet
          today={today}
          range={range}
          items={items}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
