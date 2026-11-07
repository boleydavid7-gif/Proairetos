import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { deviceKind } from '../../app/install/installPrompt';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { nowStamp, plans, trips } from '../app/state';
import { dayText } from '../app/ui';
import { directionsTo } from '../core/links';
import { tripDates } from '../core/model';

/** One thing on a day: change it, move it to another day, find the way there, or delete it. */
export default function PlanPage({ nav, id }: { nav: PoreiaNav; id: string }) {
  const item = plans.use().find((each) => each.id === id);
  const trip = trips.use().find((each) => each.id === item?.tripId);
  const [form, setForm] = useState(() => ({ title: item?.title ?? '', date: item?.date ?? '', time: item?.time ?? '', where: item?.where ?? '', note: item?.note ?? '' }));
  if (!item) {
    return (
      <div className="page poreia-page">
        <BackLink label="Back" onBack={nav.back} />
        <p className="muted">This isn’t on the plan anymore.</p>
      </div>
    );
  }
  const dates = trip ? tripDates(trip) : [];
  const choices = dates.includes(item.date) ? dates : [item.date, ...dates];
  const changed = form.title.trim() !== item.title || form.date !== item.date || form.time !== (item.time ?? '') || form.where !== (item.where ?? '') || form.note !== (item.note ?? '');
  const apple = deviceKind() === 'iphone' || /Mac/.test(navigator.platform);

  const save = () => {
    if (!form.title.trim()) return;
    const before = item;
    plans.put({ ...item, title: form.title.trim(), date: form.date, time: form.time || undefined, where: form.where.trim() || undefined, note: form.note.trim() || undefined, updatedAt: nowStamp() });
    offerUndo(form.date !== before.date ? `“${form.title.trim()}” moved to ${dayText(form.date)}` : 'Saved', () => plans.put(before));
    nav.back();
  };

  return (
    <div className="page poreia-page">
      <BackLink label={trip?.name ?? 'Back'} onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{item.title}</h1>
        <p className="muted">{[dayText(item.date), item.where].filter(Boolean).join(' · ')}</p>
      </div>

      {(item.where || item.url) && (
        <div className="button-row">
          {item.where && (
            <a className="button-main" href={directionsTo(item.where, item.lat, item.lon, apple)} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          )}
          {item.url && (
            <a className="button-quiet" href={item.url} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          )}
        </div>
      )}

      <section className="card">
        <label className="field">
          <span className="field__label">What</span>
          <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <div className="input-row">
          <label className="field">
            <span className="field__label">Day</span>
            <select className="input" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}>
              {choices.map((date) => (
                <option key={date} value={date}>
                  {dayText(date)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Time</span>
            <input className="input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Where</span>
          <input className="input" value={form.where} onChange={(event) => setForm({ ...form, where: event.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Notes</span>
          <textarea className="input area" rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </label>
        <button type="button" className="button-main" disabled={!changed || !form.title.trim()} onClick={save}>
          Save
        </button>
      </section>

      <button
        type="button"
        className="text-link remove-link"
        onClick={() => {
          plans.remove(item.id);
          offerUndo(`“${item.title}” deleted`, () => plans.put(item));
          nav.back();
        }}
      >
        Delete
      </button>
    </div>
  );
}
