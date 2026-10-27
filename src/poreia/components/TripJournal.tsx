import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import SwipeItem from '../../app/family/SwipeItem';
import { dayText } from '../app/ui';
import { journal, newId, nowStamp, today } from '../app/state';
import { JOURNAL_ENTRY_KINDS, type JournalEntry, type JournalEntryKind, type Trip } from '../core/model';

/** A dated travel journal and log, kept with the trip and available offline. */
export default function TripJournal({ trip }: { trip: Trip }) {
  const entries = journal
    .use()
    .filter((entry) => entry.tripId === trip.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const [editing, setEditing] = useState<string>();
  const [date, setDate] = useState(trip.start ?? today());
  const [kind, setKind] = useState<JournalEntryKind>('day');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [text, setText] = useState('');

  const clear = () => {
    setEditing(undefined);
    setDate(trip.start ?? today());
    setKind('day');
    setTitle('');
    setPlace('');
    setText('');
  };
  const edit = (entry: JournalEntry) => {
    setEditing(entry.id);
    setDate(entry.date);
    setKind(entry.kind);
    setTitle(entry.title ?? '');
    setPlace(entry.place ?? '');
    setText(entry.text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const save = () => {
    if (!text.trim() || !date) return;
    const now = nowStamp();
    const previous = editing ? journal.get(editing) : undefined;
    const entry: JournalEntry = {
      id: editing ?? newId(),
      tripId: trip.id,
      date,
      kind,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(place.trim() ? { place: place.trim() } : {}),
      text: text.trim(),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    journal.put(entry);
    offerUndo(editing ? 'Journal entry updated' : 'Journal entry added', () => (previous ? journal.put(previous) : journal.remove(entry.id)));
    clear();
  };

  return (
    <div className="poreia-journal">
      <section className="card poreia-journal__form">
        <div className="section-head">
          <h2 className="card__title">{editing ? 'Edit journal entry' : 'Add to your journal'}</h2>
          {editing && <button type="button" className="text-link" onClick={clear}>Cancel</button>}
        </div>
        <div className="input-row">
          <label className="field">
            <span className="field__label">Day</span>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Type</span>
            <select className="input" value={kind} onChange={(event) => setKind(event.target.value as JournalEntryKind)}>
              {JOURNAL_ENTRY_KINDS.map((each) => <option key={each.id} value={each.id}>{each.label}</option>)}
            </select>
          </label>
        </div>
        <div className="input-row">
          <label className="field">
            <span className="field__label">Title <span className="muted">(optional)</span></span>
            <input className="input" value={title} placeholder="A first morning in Kyoto" onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Place <span className="muted">(optional)</span></span>
            <input className="input" value={place} placeholder={trip.place?.name ?? 'Neighborhood or place'} onChange={(event) => setPlace(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">What happened</span>
          <textarea className="input area" rows={4} value={text} placeholder="Write down what you want to remember." onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="button" className="button-main" disabled={!text.trim() || !date} onClick={save}>{editing ? 'Update entry' : 'Save entry'}</button>
      </section>

      <section aria-labelledby="poreia-journal-heading">
        <div className="section-head">
          <h2 id="poreia-journal-heading" className="card__title">Travel log</h2>
          {entries.length > 0 && <span className="muted">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>}
        </div>
        {entries.length === 0 ? <p className="muted">Your days and memories will appear here.</p> : (
          <ul className="poreia-journal__list">
            {entries.map((entry) => (
              <SwipeItem key={entry.id} className="poreia-journal__item" label="Delete" tone="remove" onSwipe={() => { journal.remove(entry.id); offerUndo('Journal entry deleted', () => journal.put(entry)); }}>
                <button type="button" className="poreia-journal__open" onClick={() => edit(entry)}>
                  <span className="poreia-journal__meta">{dayText(entry.date)} · {JOURNAL_ENTRY_KINDS.find((each) => each.id === entry.kind)?.label}{entry.place ? ` · ${entry.place}` : ''}</span>
                  <strong>{entry.title || entry.text.slice(0, 60)}</strong>
                  <span>{entry.text}</span>
                </button>
              </SwipeItem>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
