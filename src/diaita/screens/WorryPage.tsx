import { useState } from 'react';
import { BackIcon, PlusIcon } from '../../app/family/icons';
import { offerUndo } from '../../app/family/shell';
import type { DiaitaNav } from '../app/App';
import { settings, worries, type Worry } from '../app/state';

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

function WorryForm({ onDone }: { onDone: () => void }) {
  const [concern, setConcern] = useState('');
  const [nextStep, setNextStep] = useState('');
  const save = () => {
    const worry: Worry = { id: newId(), concern: concern.trim(), nextStep: nextStep.trim() || undefined, createdAt: new Date().toISOString() };
    worries.put(worry);
    setConcern('');
    setNextStep('');
    onDone();
  };
  return (
    <section className="card diaita-worry-form">
      <label className="field">
        <span className="field__label">What is on your mind?</span>
        <textarea className="input" rows={3} value={concern} onChange={(event) => setConcern(event.target.value)} autoFocus />
      </label>
      <label className="field">
        <span className="field__label">One next step (optional)</span>
        <input className="input" value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="Ask tomorrow" />
      </label>
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onDone}>Cancel</button>
        <button type="button" className="button-main" disabled={!concern.trim()} onClick={save}>Save</button>
      </div>
    </section>
  );
}

function WorryRow({ worry }: { worry: Worry }) {
  return (
    <li className="row diaita-worry-row">
      <span className="row__text"><span>{worry.concern}</span>{worry.nextStep && <span className="row__detail">Next: {worry.nextStep}</span>}</span>
      <a className="text-link" href={`/?open=think-through&text=${encodeURIComponent(worry.concern)}`}>Think it through</a>
      <button type="button" className="text-link" onClick={() => { worries.remove(worry.id); offerUndo('Worry removed', () => worries.put(worry)); }}>Remove</button>
    </li>
  );
}

export default function WorryPage({ nav }: { nav: DiaitaNav }) {
  const all = worries.use().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [adding, setAdding] = useState(false);
  const current = settings.use();
  return (
    <div className="page diaita-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        <h1 className="title">Worry time</h1>
      </div>
      <p className="muted">At {current.worryTime}. One next step for each.</p>
      {!adding && <button type="button" className="button-main" onClick={() => setAdding(true)}><PlusIcon size={18} />Add a worry</button>}
      {adding && <WorryForm onDone={() => setAdding(false)} />}
      {all.length > 0 ? <ul className="rows diaita-worry-list">{all.map((worry) => <WorryRow key={worry.id} worry={worry} />)}</ul> : <p className="muted">Nothing written down yet.</p>}
      <a className="text-link" href="/?open=capture">Write another concern in Proairetos Capture</a>
    </div>
  );
}
