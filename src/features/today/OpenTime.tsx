import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import type { LifeItem } from '../../core/life-items/types';
import { stackedStarts, type Span } from '../../core/rhythm/openTime';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { formatTimeOf } from '../schedule/format';
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
  const [time, setTime] = useState(timeValue(stretch.start));
  const groups = placeableGroups(items, today);
  const at = timeInStretch(time, stretch);
  const fits = at >= stretch.start && at < stretch.end;
  // Several at once: the picks go one after another from the chosen time, in the order they were picked.
  const [several, setSeveral] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const all = groups.flatMap((group) => group.items);
  const chosenItems = picked.map((id) => all.find((item) => item.id === id)).filter((item): item is LifeItem => Boolean(item));
  const stack = stackedStarts(stretch, at, chosenItems.length);
  const allFit = chosenItems.length > 0 && stack.fit === chosenItems.length;

  async function placeAll() {
    const before = chosenItems.map((item) => ({ id: item.id, at: item.scheduledAt }));
    for (const [index, item] of chosenItems.entries()) await lifeService.schedule(item.id, stack.starts[index].toISOString());
    offerUndo(`${chosenItems.length} set from ${formatTimeOf(stack.starts[0])}`, async () => {
      for (const each of before) await lifeService.schedule(each.id, each.at);
    });
    close();
  }

  async function place(item: LifeItem) {
    await lifeService.schedule(item.id, at.toISOString());
    offerUndo(`“${item.title}” set for ${formatTimeOf(at)}`, async () => {
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

        <label className="place-time">
          <span>At</span>
          <input type="time" className="field-input" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        {!fits && <p className="form-error">That time is outside this stretch.</p>}

        {all.length > 1 && (
          <button type="button" className="text-link place-several" aria-pressed={several} onClick={() => { setSeveral(!several); setPicked([]); }}>
            {several ? 'One at a time' : 'Several'}
          </button>
        )}

        {groups.length === 0 && <p className="empty-note">Nothing open without a time.</p>}
        {groups.map((group) => (
          <section key={group.id} className="sheet__section" aria-label={group.label}>
            <p className="sheet__label">{group.label}</p>
            <ul className="place-list">
              {group.items.map((item) => (
                <li key={item.id}>
                  {several ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={picked.includes(item.id)}
                      className="place-row place-row--pick"
                      onClick={() => setPicked(picked.includes(item.id) ? picked.filter((id) => id !== item.id) : [...picked, item.id])}
                    >
                      <span className="place-row__order" aria-hidden="true">{picked.includes(item.id) ? picked.indexOf(item.id) + 1 : ''}</span>
                      {item.title}
                    </button>
                  ) : (
                    <button type="button" className="place-row" disabled={!fits} onClick={() => place(item)}>
                      {item.title}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {several && chosenItems.length > 0 && (
          <section className="place-plan" aria-label="Where they go">
            <ul>
              {chosenItems.map((item, index) => (
                <li key={item.id}>
                  <span>{formatTimeOf(stack.starts[index])}</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
            {!allFit && <p className="form-error">{stack.fit === 0 ? 'None fit in this stretch.' : `Only ${stack.fit} fit in this stretch.`}</p>}
            <button type="button" className="button-accent" disabled={!allFit} onClick={() => void placeAll()}>
              Set {chosenItems.length === 1 ? 'it' : `these ${chosenItems.length}`}
            </button>
          </section>
        )}
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
