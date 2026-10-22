import { useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import SwipeItem from '../../app/family/SwipeItem';
import { Sym } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';
import { bookings, newId, nowStamp, packing, settings, today } from '../app/state';
import { forecast } from '../app/world';
import { PACK_GROUPS, nightsOf, type PackGroup, type PackItem, type Trip } from '../core/model';
import { suggestedPacking } from '../core/packing';
import { daysBetween } from '../../core/scheduling/dates';
import RouteEmpty from './RouteEmpty';

/** The packing list: offered once from the trip's length, weather and bookings, then the person's own. */
export default function TripPacking({ trip }: { trip: Trip }) {
  const list = packing.use().filter((each) => each.tripId === trip.id);
  const home = settings.use().home;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<PackGroup>('other');
  const packed = list.filter((each) => each.packed).length;

  const suggest = async () => {
    setBusy(true);
    let low: number | undefined;
    let high: number | undefined;
    let rain = false;
    const { lat, lon } = trip.place ?? {};
    if (lat !== undefined && lon !== undefined && trip.start && daysBetween(today(), trip.start) <= 14) {
      try {
        const days = (await forecast(lat, lon)).filter((day) => day.date >= trip.start! && day.date <= (trip.end ?? trip.start!));
        if (days.length) {
          low = Math.min(...days.map((day) => day.low));
          high = Math.max(...days.map((day) => day.high));
          rain = days.some((day) => (day.rain ?? 0) >= 50);
        }
      } catch {
        // Without the forecast the list leaves weather out.
      }
    }
    const abroad = Boolean(trip.place?.countryCode && home?.countryCode && trip.place.countryCode !== home.countryCode);
    const kinds = bookings.list().filter((each) => each.tripId === trip.id).map((each) => each.kind);
    const items: PackItem[] = suggestedPacking({ nights: nightsOf(trip), abroad, low, high, rain, kinds }).map((each) => ({ id: newId(), tripId: trip.id, name: each.name, group: each.group, packed: false, createdAt: nowStamp() }));
    items.forEach((item) => packing.put(item));
    setBusy(false);
    offerUndo(`${items.length} things added`, () => items.forEach((item) => packing.remove(item.id)));
  };

  return (
    <>
      {list.length === 0 ? (
        <RouteEmpty glyph="suitcase" title="Nothing to pack yet" line={`A starting list from the trip’s length${trip.place?.lat !== undefined ? ', weather' : ''} and bookings, or your own below.`}>
          <button type="button" className="button-main" disabled={busy} onClick={() => void suggest()}>
            {busy ? <Waiting>Making a list…</Waiting> : 'Suggest a list'}
          </button>
        </RouteEmpty>
      ) : (
        <PackedBar packed={packed} total={list.length} />
      )}

      {PACK_GROUPS.map(({ id, label }) => {
        const items = list.filter((each) => each.group === id).sort((a, b) => Number(a.packed) - Number(b.packed) || a.createdAt.localeCompare(b.createdAt));
        if (!items.length) return null;
        return (
          <section key={id} className="poreia-pack-group">
            <p className="ll-section-label">{label}</p>
            <ul className="rows">
              {items.map((item) => (
                <SwipeItem
                  key={item.id}
                  className="poreia-pack"
                  label="Delete"
                  tone="remove"
                  onSwipe={() => {
                    packing.remove(item.id);
                    offerUndo(`“${item.name}” deleted`, () => packing.put(item));
                  }}
                >
                  <button
                    type="button"
                    className="check-row poreia-pack__row"
                    aria-pressed={item.packed}
                    onClick={() => {
                      if (!item.packed) tap();
                      packing.put({ ...item, packed: !item.packed });
                    }}
                  >
                    <span className="check-row__box">{item.packed ? <Sym name="check" size={16} /> : null}</span>
                    <span className={item.packed ? 'poreia-pack__done' : undefined}>{item.name}</span>
                  </button>
                </SwipeItem>
              ))}
            </ul>
          </section>
        );
      })}

      <form
        className="poreia-pack-add"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          packing.put({ id: newId(), tripId: trip.id, name: name.trim(), group, packed: false, createdAt: nowStamp() });
          setName('');
        }}
      >
        <input className="input" value={name} placeholder="Add something to pack" onChange={(event) => setName(event.target.value)} />
        <select className="input poreia-select" value={group} aria-label="Group" onChange={(event) => setGroup(event.target.value as PackGroup)}>
          {PACK_GROUPS.map((each) => (
            <option key={each.id} value={each.id}>
              {each.label}
            </option>
          ))}
        </select>
        <button type="submit" className="button-quiet" disabled={!name.trim()}>
          Add
        </button>
      </form>

      {packed > 0 && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            const before = list.filter((each) => each.packed);
            before.forEach((item) => packing.put({ ...item, packed: false }));
            offerUndo('Packing cleared', () => before.forEach((item) => packing.put(item)));
          }}
        >
          Unpack all (for the trip home)
        </button>
      )}
    </>
  );
}

/** How much is packed, as a count and a thin bar. */
function PackedBar({ packed, total }: { packed: number; total: number }) {
  return (
    <div className="poreia-packed">
      <p className="poreia-packed__count">
        {packed === total ? 'All packed' : `${packed} of ${total} packed`}
      </p>
      <div className="poreia-saving__bar" aria-hidden="true">
        <span style={{ width: `${total ? (packed / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
