import { useState } from 'react';
import type { Nav } from '../app/App';
import { newId } from '../app/state';
import { reflectMilestones, type FinancialMilestone } from '../data/reflect';
import { PageTop } from '../app/ui';

function localDay(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Only milestones written here can appear in Reflect; financial source data stays in Oikonomia. */
function FinancialMilestones() {
  const entries = [...reflectMilestones.use()].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(localDay());

  const reset = () => {
    setEditingId('');
    setTitle('');
    setBody('');
    setDate(localDay());
  };
  const save = () => {
    if (!title.trim() || !date) return;
    const now = new Date().toISOString();
    const previous = editingId ? reflectMilestones.get(editingId) : undefined;
    const entry: FinancialMilestone = {
      id: editingId || newId(),
      title: title.trim(),
      ...(body.trim() ? { body: body.trim() } : {}),
      date,
      inReflect: previous?.inReflect ?? true,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    reflectMilestones.put(entry);
    reset();
  };

  return (
    <section className="oiko-data oiko-reflect-milestones">
      <div className="oiko-reflect-milestones__form">
        <label className="field"><span className="field__label">Milestone</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field"><span className="field__label">Date</span><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field"><span className="field__label">Details <span className="muted">(optional)</span></span><textarea className="input area" rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <div className="button-row">
          <button type="button" className="button-main" disabled={!title.trim() || !date} onClick={save}>{editingId ? 'Save changes' : 'Add milestone'}</button>
          {editingId && <button type="button" className="button-quiet" onClick={reset}>Cancel</button>}
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="rows oiko-reflect-milestones__list">
          {entries.map((entry) => (
            <li key={entry.id} className="oiko-reflect-milestones__item">
              <label className="row">
                <input type="checkbox" checked={entry.inReflect} onChange={(event) => reflectMilestones.put({ ...entry, inReflect: event.target.checked, updatedAt: new Date().toISOString() })} />
                <span className="row__text"><strong>{entry.title}</strong><small>{entry.date}{entry.body ? ` · ${entry.body}` : ''}</small></span>
              </label>
              <div className="button-row">
                <button type="button" className="text-link" onClick={() => { setEditingId(entry.id); setTitle(entry.title); setBody(entry.body ?? ''); setDate(entry.date); }}>Edit</button>
                <button type="button" className="text-link" onClick={() => { reflectMilestones.remove(entry.id); if (editingId === entry.id) reset(); }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


export default function MilestonesPage({ nav }: { nav: Nav }) {
  return (
    <div className="page oiko-page">
      <PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop>
      <h1 className="title">Financial milestones</h1>
      <FinancialMilestones />
    </div>
  );
}
