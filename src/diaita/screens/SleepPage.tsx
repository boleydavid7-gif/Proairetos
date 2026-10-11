import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackIcon, PlusIcon } from '../../app/family/icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { DiaitaNav } from '../app/App';
import { sleeps } from '../app/state';
import { weekdayText } from '../app/ui';
import { QUALITY_NAMES, hoursText, sleepFacts, sleptMinutes, type SleepQuality, type SleepRecord } from '../core/rhythm';

type Kept = SleepRecord & { id: string };

function SleepForm({ record, onDone }: { record?: Kept; onDone: () => void }) {
  const today = toLocalDate(new Date());
  const [date, setDate] = useState(record?.date ?? today);
  const [bed, setBed] = useState(record?.bed ?? '23:00');
  const [up, setUp] = useState(record?.up ?? '07:00');
  const [how, setHow] = useState<SleepQuality | undefined>(record?.how);
  const [note, setNote] = useState(record?.note ?? '');

  const save = () => {
    const before = record;
    const replaced = sleeps.get(date);
    if (record && record.id !== date) sleeps.remove(record.id);
    sleeps.put({ id: date, date, bed, up, how, note: note.trim() || undefined });
    offerUndo(record ? 'Sleep changed' : 'Sleep saved', () => {
      sleeps.remove(date);
      if (replaced) sleeps.put(replaced);
      if (before) sleeps.put(before);
    });
    onDone();
  };

  return (
    <section className="card diaita-form">
      <label className="field">
        <span className="field__label">Woke on</span>
        <input className="input" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="input-row">
        <label className="field">
          <span className="field__label">Bed</span>
          <input className="input" type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Up</span>
          <input className="input" type="time" value={up} onChange={(event) => setUp(event.target.value)} />
        </label>
      </div>
      <div className="chip-row" role="group" aria-label="How you slept">
        {(['well', 'okay', 'poorly'] as const).map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={how === option} onClick={() => setHow(how === option ? undefined : option)}>
            {QUALITY_NAMES[option]}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onDone}>Cancel</button>
        <button type="button" className="button-main" disabled={!date || !bed || !up} onClick={save}>Save</button>
      </div>
      {record && (
        <button
          type="button"
          className="text-link diaita-remove"
          onClick={() => {
            sleeps.remove(record.id);
            offerUndo('Sleep removed', () => sleeps.put(record));
            onDone();
          }}
        >
          Remove
        </button>
      )}
    </section>
  );
}

export default function SleepPage({ nav, adding }: { nav: DiaitaNav; adding?: string | true }) {
  const all = [...sleeps.use()].sort((a, b) => b.date.localeCompare(a.date));
  const [editing, setEditing] = useState<string | true | undefined>(adding);
  const today = toLocalDate(new Date());
  const recent = all.filter((record) => record.date > addDays(today, -14));
  const facts = sleepFacts(recent);
  const editingRecord = typeof editing === 'string' ? all.find((record) => record.id === editing) : undefined;
  const done = () => (adding ? nav.back() : setEditing(undefined));

  return (
    <div className="page diaita-page">
      <div className="page-top">
        {adding ? (
          <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        ) : (
          <h1 className="title">Sleep</h1>
        )}
      </div>

      {editing ? (
        <SleepForm key={String(editing)} record={editingRecord} onDone={done} />
      ) : (
        <>
          {facts && (
            <div className="tiles">
              <div className="tile"><span className="tile__label">Average, 2 weeks</span><span className="tile__value">{hoursText(facts.averageMinutes)}</span></div>
              <div className="tile"><span className="tile__label">Nights logged</span><span className="tile__value">{facts.nights}</span></div>
            </div>
          )}
          <button type="button" className="button-main diaita-add" onClick={() => setEditing(true)}><PlusIcon size={18} />Add a night</button>
          {all.length === 0 ? (
            <p className="muted">No nights logged yet.</p>
          ) : (
            <ul className="rows">
              {all.map((record) => (
                <li key={record.id}>
                  <button type="button" className="row diaita-night" onClick={() => setEditing(record.id)}>
                    <span className="row__icon diaita-night__hours">{hoursText(sleptMinutes(record)).replace(' min', 'm').replace(' h', 'h')}</span>
                    <span className="row__text">
                      <span>{weekdayText(record.date, today)}</span>
                      <span className="row__detail">{record.bed}–{record.up}{record.how ? ` · ${QUALITY_NAMES[record.how]}` : ''}{record.note ? ` · ${record.note}` : ''}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
