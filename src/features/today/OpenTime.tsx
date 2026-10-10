import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import type { LifeItem } from '../../core/life-items/types';
import type { Span } from '../../core/rhythm/openTime';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { formatTimeOf } from '../schedule/format';
import EnergyChoice, { useEnergy } from './EnergyChoice';
import NotForMe from './NotForMe';
import { placeableGroups } from './placeable';
import { formatDuration } from './timeline';

const pad = (n: number) => String(n).padStart(2, '0');
const timeValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** A clock time inside the stretch: the day it starts, or the next if the stretch runs past midnight. */
function timeInStretch(time: string, stretch: Span): Date {
  const first = atTime(toLocalDate(stretch.start), time);
  return first < stretch.start ? atTime(addDays(toLocalDate(stretch.start), 1), time) : first;
}

function PlaceSheet({ stretch, items, today, onClose }: { stretch: Span; items: LifeItem[]; today: string; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const energy = useEnergy(today);
  const [time, setTime] = useState(timeValue(stretch.start));
  const groups = placeableGroups(items, today, energy);
  const at = timeInStretch(time, stretch);
  const fits = at >= stretch.start && at < stretch.end;

  async function place(item: LifeItem) {
    await lifeService.schedule(item.id, at.toISOString());
    offerUndo(`Set for ${formatTimeOf(at)}: ${item.title}`, async () => {
      await lifeService.schedule(item.id, undefined);
    });
    close();
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Put something in this time"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">
          {formatTimeOf(stretch.start)} – {formatTimeOf(stretch.end)}
        </p>
        <p className="sheet__hint">Give one thing a time, if you like. Nothing else moves.</p>

        <label className="place-time">
          <span>At</span>
          <input type="time" className="field-input" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        {!fits && <p className="form-error">That time is outside this stretch.</p>}

        <EnergyChoice date={today} />

        {groups.length === 0 && <p className="empty-note">Nothing open without a time.</p>}
        {groups.map((group) => (
          <section key={group.id} className="sheet__section" aria-label={group.label}>
            <p className="sheet__label">{group.label}</p>
            <ul className="place-list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="place-row" disabled={!fits} onClick={() => place(item)}>
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}

/**
 * The open stretches left in the day, as plain clock facts. Tapping one
 * offers to give something a time there; nothing is placed on its own.
 */
export default function OpenTime({ stretches, items, today }: { stretches: Span[]; items: LifeItem[]; today: string }) {
  const [chosen, setChosen] = useState<Span | null>(null);
  if (stretches.length === 0) return null;

  return (
    <section className="today-section today-section--card" aria-label="Open time">
      <div className="section-heading">
        <h2 className="section-label">Open time</h2>
        <NotForMe part="open-time" />
      </div>
      <ul className="open-time">
        {stretches.map((stretch) => (
          <li key={stretch.start.toISOString()}>
            <button type="button" className="open-time__row" onClick={() => setChosen(stretch)}>
              <span>
                {formatTimeOf(stretch.start)} – {formatTimeOf(stretch.end)}
              </span>
              <span className="open-time__length">{formatDuration(stretch.end.getTime() - stretch.start.getTime())}</span>
            </button>
          </li>
        ))}
      </ul>
      {chosen && <PlaceSheet stretch={chosen} items={items} today={today} onClose={() => setChosen(null)} />}
    </section>
  );
}
