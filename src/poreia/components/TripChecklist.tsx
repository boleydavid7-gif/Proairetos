import { useMemo, useState } from 'react';
import { CheckIcon, PlusIcon } from '../app/icons';
import type { Trip, TripTask, TripTaskCategory } from '../core/trips';
import { suggestedTripTasks, tripTaskProgress } from '../core/trips';
import { putTrip } from '../data/store';

const categories: Array<{ id: TripTaskCategory; label: string }> = [
  { id: 'planning', label: 'Planning and details' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'documents', label: 'Documents' },
  { id: 'before-you-go', label: 'Before you go' },
];

function nextTrip(trip: Trip, checklist: TripTask[]): Trip {
  return { ...trip, checklist, updatedAt: new Date().toISOString() };
}

export default function TripChecklist({ trip }: { trip: Trip }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TripTaskCategory>('planning');
  const checklist = trip.checklist ?? [];
  const progress = tripTaskProgress(trip);
  const grouped = useMemo(() => categories.map((group) => ({ ...group, tasks: checklist.filter((task) => task.category === group.id) })), [checklist]);
  const save = async (next: TripTask[]) => putTrip(nextTrip(trip, next));
  const generate = async () => save(suggestedTripTasks(trip));
  const toggle = async (task: TripTask) => save(checklist.map((item) => item.id === task.id ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() } : item));
  const add = async () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    await save([...checklist, { id: `${trip.id}-task-${now}`, title: title.trim(), category, completed: false, createdAt: now, updatedAt: now }]);
    setTitle(''); setAdding(false);
  };
  return <section className="poreia-trip-checklist poreia-section">
    <div className="poreia-checklist-summary"><div><p className="label">Trip readiness</p><h2>{progress.total ? `${progress.complete} of ${progress.total} complete` : 'Start your checklist'}</h2><p>{progress.total ? `${progress.total - progress.complete} item${progress.total - progress.complete === 1 ? '' : 's'} remaining.` : 'Shape a practical checklist for this trip.'}</p></div>{progress.total > 0 && <span className="poreia-checklist-summary__percent">{Math.round(progress.complete / progress.total * 100)}%</span>}</div>
    {progress.total > 0 && <div className="poreia-progress" role="progressbar" aria-label="Trip checklist progress" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.complete}><span style={{ width: `${progress.complete / progress.total * 100}%` }} /></div>}
    {!checklist.length ? <div className="card poreia-empty"><CheckIcon size={28} /><h2 className="card__title">Your checklist starts here</h2><p className="muted">Poreia can suggest a starting list based on this trip. You can change every item.</p><div className="button-row"><button type="button" className="button-main" onClick={() => void generate()}>Generate suggested checklist</button><button type="button" className="button-quiet" onClick={() => setAdding(true)}>Add your own task</button></div></div> : <div className="poreia-checklist-groups">{grouped.filter((group) => group.tasks.length).map((group) => <section className="poreia-checklist-group" key={group.id}><div className="poreia-section-head"><h3>{group.label}</h3><span className="label">{group.tasks.filter((task) => task.completed).length}/{group.tasks.length}</span></div>{group.tasks.map((task) => <label className="poreia-checklist-item" key={task.id}><input type="checkbox" checked={task.completed} onChange={() => void toggle(task)} /><span className="poreia-checklist-item__mark">{task.completed && <CheckIcon size={16} />}</span><span>{task.title}</span></label>)}</section>)}</div>}
    {adding && <form className="card poreia-form poreia-checklist-add" onSubmit={(event) => { event.preventDefault(); void add(); }}><div className="poreia-section-head"><h3>Add a task</h3><button type="button" className="text-link" onClick={() => setAdding(false)}>Cancel</button></div><label className="field"><span className="field__label">Task</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Arrange airport transfer" autoFocus required /></label><label className="field"><span className="field__label">Category</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value as TripTaskCategory)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button type="submit" className="button-main"><PlusIcon size={18} /> Add task</button></form>}
    {checklist.length > 0 && <button type="button" className="button-quiet" onClick={() => setAdding(true)}><PlusIcon size={18} /> Add task</button>}
  </section>;
}
