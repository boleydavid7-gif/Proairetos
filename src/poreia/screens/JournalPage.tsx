import { useMemo, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import Attachments from '../../features/items/attachments/Attachments';
import { BookIcon, ChevronIcon, PlusIcon } from '../../app/family/icons';
import type { PoreiaNav } from '../app/App';
import { journal, newId, nowStamp, today, trips } from '../app/state';
import { dayText } from '../app/ui';
import { JOURNAL_ENTRY_KINDS, type JournalEntry, type JournalEntryKind } from '../core/model';
import RouteEmpty from '../components/RouteEmpty';

/** The cross-trip journal: a dated log, memories and notes in one place. */
export default function JournalPage({ nav }: { nav: PoreiaNav }) {
  const list = trips.use();
  const entries = journal.use();
  const [tripFilter, setTripFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState<'all' | JournalEntryKind>('all');
  const [editing, setEditing] = useState<string>();
  const [tripId, setTripId] = useState(list[0]?.id ?? '');
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<JournalEntryKind>('day');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [text, setText] = useState('');

  const byId = useMemo(() => new Map(list.map((trip) => [trip.id, trip])), [list]);
  const shown = useMemo(() => entries
    .filter((entry) => tripFilter === 'all' || entry.tripId === tripFilter)
    .filter((entry) => kindFilter === 'all' || entry.kind === kindFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [entries, kindFilter, tripFilter]);
  const clear = () => {
    setEditing(undefined);
    setTripId(tripFilter !== 'all' ? tripFilter : list[0]?.id ?? '');
    setDate(today());
    setKind('day');
    setTitle('');
    setPlace('');
    setText('');
  };
  const edit = (entry: JournalEntry) => {
    setEditing(entry.id);
    setTripId(entry.tripId);
    setDate(entry.date);
    setKind(entry.kind);
    setTitle(entry.title ?? '');
    setPlace(entry.place ?? '');
    setText(entry.text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const save = () => {
    if (!tripId || !date || !text.trim()) return;
    const now = nowStamp();
    const previous = editing ? journal.get(editing) : undefined;
    const entry: JournalEntry = {
      id: editing ?? newId(),
      tripId,
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
    setEditing(entry.id);
  };

  if (!list.length) {
    return (
      <div className="page poreia-page">
        <div className="page-top"><h1 className="title">Journal</h1></div>
        <RouteEmpty glyph="book" title="Start with a trip" line="Your travel log will gather days, memories and notes here.">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'trip-form' })}><PlusIcon size={18} /> Plan a trip</button>
        </RouteEmpty>
      </div>
    );
  }

  return (
    <div className="page poreia-page poreia-journal-page">
      <div className="page-top poreia-journal-page__top">
        <div>
          <p className="eyebrow"><BookIcon size={16} /> Travel journal</p>
          <h1 className="title">Journal &amp; log</h1>
        </div>
        <span className="poreia-journal-page__count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      <section className="card poreia-journal__form">
        <div className="section-head">
          <h2 className="card__title">{editing ? 'Edit entry' : 'Add to your journal'}</h2>
          {editing && <button type="button" className="text-link" onClick={clear}>New entry</button>}
        </div>
        <div className="input-row">
          <label className="field"><span className="field__label">Trip</span><select className="input" value={tripId} onChange={(event) => setTripId(event.target.value)}>{list.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>
          <label className="field"><span className="field__label">Day</span><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        <div className="input-row">
          <label className="field"><span className="field__label">Entry type</span><select className="input" value={kind} onChange={(event) => setKind(event.target.value as JournalEntryKind)}>{JOURNAL_ENTRY_KINDS.map((each) => <option key={each.id} value={each.id}>{each.label}</option>)}</select></label>
          <label className="field"><span className="field__label">Place <span className="muted">(optional)</span></span><input className="input" value={place} placeholder="Neighborhood or place" onChange={(event) => setPlace(event.target.value)} /></label>
        </div>
        <label className="field"><span className="field__label">Title <span className="muted">(optional)</span></span><input className="input" value={title} placeholder="A first morning in Kyoto" onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field"><span className="field__label">Your entry</span><textarea className="input area" rows={5} value={text} placeholder="Write what happened, what you noticed, or what you want to remember." onChange={(event) => setText(event.target.value)} /></label>
        <button type="button" className="button-main" disabled={!tripId || !date || !text.trim()} onClick={save}>{editing ? 'Update entry' : 'Save entry'}</button>
        {editing && <div className="poreia-journal__photos"><Attachments itemId={editing} /><p className="fine">Photos stay on this device until your selected backup runs, then follow your connected BYO storage.</p></div>}
      </section>

      <section className="poreia-journal-page__log" aria-labelledby="journal-log-heading">
        <div className="section-head"><div><p className="eyebrow">A place for the details</p><h2 id="journal-log-heading">Your travel log</h2></div></div>
        <div className="poreia-journal-page__filters">
          <label className="field"><span className="visually-hidden">Trip filter</span><select className="input" value={tripFilter} onChange={(event) => setTripFilter(event.target.value)}><option value="all">All trips</option>{list.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>
          <div className="chip-row" role="group" aria-label="Entry type"><button type="button" className="chip" aria-pressed={kindFilter === 'all'} onClick={() => setKindFilter('all')}>Everything</button>{JOURNAL_ENTRY_KINDS.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={kindFilter === each.id} onClick={() => setKindFilter(each.id)}>{each.label}</button>)}</div>
        </div>
        {shown.length === 0 ? <p className="muted poreia-quiet">Nothing in this view yet.</p> : <ul className="poreia-journal-page__list">{shown.map((entry) => {
          const trip = byId.get(entry.tripId);
          return <li key={entry.id} className="poreia-journal-card">
            <div className="poreia-journal-card__date"><strong>{dayText(entry.date)}</strong><span>{trip?.name ?? 'Trip'}</span></div>
            <div className="poreia-journal-card__body"><div className="poreia-journal-card__meta">{JOURNAL_ENTRY_KINDS.find((each) => each.id === entry.kind)?.label}{entry.place ? ` · ${entry.place}` : ''}</div><h3>{entry.title || entry.text.slice(0, 60)}</h3><p>{entry.text}</p><div className="poreia-journal-card__actions"><button type="button" className="text-link" onClick={() => edit(entry)}>Edit</button><button type="button" className="text-link" onClick={() => nav.go({ name: 'trip', id: entry.tripId, view: 'journal' })}>Open trip <ChevronIcon size={16} /></button><button type="button" className="text-link poreia-danger" onClick={() => { journal.remove(entry.id); offerUndo('Journal entry deleted', () => journal.put(entry)); if (editing === entry.id) clear(); }}>Delete</button></div><Attachments itemId={entry.id} /></div>
          </li>;
        })}</ul>}
      </section>
    </div>
  );
}
