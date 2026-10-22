import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon, VisitIcon } from '../../app/family/icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { allMedicines, appointments, newId, putAppointment, removeAppointment } from '../app/state';
import { peopleIn, type Appointment } from '../core/medicines';
import { WhoChoice } from '../app/ui';

function VisitForm({ id, existing, onDone }: { id?: string; existing?: Appointment; onDone: () => void }) {
  const [who, setWho] = useState(existing?.with ?? '');
  const [forWho, setForWho] = useState(existing?.who ?? '');
  const people = peopleIn([...allMedicines(), ...appointments.list()]);
  const [day, setDay] = useState(existing?.at.slice(0, 10) ?? addDays(toLocalDate(new Date()), 7));
  const [time, setTime] = useState(existing?.at.slice(11, 16) ?? '10:00');
  const [where, setWhere] = useState(existing?.where ?? '');
  const [questions, setQuestions] = useState(existing?.questions ?? []);
  const [question, setQuestion] = useState('');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const whoField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) whoField.current?.focus();
  }, []);

  const build = (patch: Partial<Appointment> = {}): Appointment => ({
    ...(existing ?? { id: newId(), createdAt: new Date().toISOString() }),
    with: who.trim(),
    who: forWho.trim() || undefined,
    at: `${day}T${time}`,
    where: where.trim() || undefined,
    questions,
    notes: notes.trim() || undefined,
    ...patch,
  });
  const save = () => {
    putAppointment(build());
    if (existing) offerUndo('Saved', () => putAppointment(existing));
    onDone();
  };
  // Questions tick off as they are asked, saved at once on a visit already kept.
  const changeQuestions = (next: Appointment['questions']) => {
    setQuestions(next);
    if (existing) putAppointment({ ...existing, questions: next });
  };

  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={onDone}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add a visit'}</p>
        <button type="button" className="text-link" disabled={!who.trim()} onClick={save}>Save</button>
      </div>

      <label className="field">
        <span className="field__label">Who or what</span>
        <input ref={whoField} className="input" value={who} onChange={(event) => setWho(event.target.value)} placeholder="Dr Patel, blood test" />
      </label>
      <WhoChoice value={forWho} people={people} onChange={setForWho} />
      <div className="input-row">
        <label className="field">
          <span className="field__label">Day</span>
          <input className="input" type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Time</span>
          <input className="input" type="time" value={time} onChange={(event) => event.target.value && setTime(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Where (optional)</span>
        <input className="input" value={where} onChange={(event) => setWhere(event.target.value)} />
      </label>

      <section className="card">
        <h2 className="card__title card__title--small">To ask</h2>
        {questions.length > 0 && (
          <ul className="chore-list">
            {questions.map((each) => (
              <li key={each.id} className="chore">
                <button type="button" className="tick" aria-pressed={Boolean(each.asked)} aria-label={`${each.text}: asked`} onClick={() => changeQuestions(questions.map((q) => (q.id === each.id ? { ...q, asked: !q.asked } : q)))}>
                  <CheckIcon size={20} />
                </button>
                <span className="chore__open"><span>{each.text}</span></span>
                <button type="button" className="text-link" onClick={() => {
                  const before = questions;
                  changeQuestions(questions.filter((q) => q.id !== each.id));
                  offerUndo('Question removed', () => changeQuestions(before));
                }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="add-line"
          onSubmit={(event) => {
            event.preventDefault();
            const text = question.trim();
            if (!text) return;
            changeQuestions([...questions, { id: newId(), text }]);
            setQuestion('');
          }}
        >
          <input className="input" aria-label="A question" placeholder="A question" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <button type="submit" className="button-quiet" disabled={!question.trim()}>Add</button>
        </form>
      </section>

      <label className="field">
        <span className="field__label">Notes (optional)</span>
        <textarea className="input" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was said" />
      </label>

      <button type="button" className="button-main" disabled={!who.trim()} onClick={save}>Save</button>

    </div>
  );
}

function VisitView({ nav, visit, onEdit }: { nav: TherapeiaNav; visit: Appointment; onEdit: () => void }) {
  const when = new Date(visit.at);
  const tick = (id: string) => putAppointment({ ...visit, questions: visit.questions.map((each) => (each.id === id ? { ...each, asked: !each.asked } : each)) });
  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Visit</p>
        <button type="button" className="text-link" onClick={onEdit}>Edit</button>
      </div>
      <div className="detail-head">
        <span className="detail-head__mark"><VisitIcon size={32} /></span>
        <div>
          <h1 className="title">{visit.with}</h1>
          {visit.who && <p className="muted">For {visit.who}</p>}
          <p className="muted">{when.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
        </div>
      </div>
      {visit.where && (
        <dl className="detail-list">
          <dt>Where</dt>
          <dd>{visit.where}</dd>
        </dl>
      )}
      <section className="card">
        <h2 className="card__title card__title--small">To ask</h2>
        {visit.questions.length ? (
          <ul className="chore-list">
            {visit.questions.map((each) => (
              <li key={each.id} className="chore">
                <button type="button" className="tick" aria-pressed={Boolean(each.asked)} aria-label={`${each.text}: asked`} onClick={() => tick(each.id)}>
                  <CheckIcon size={20} />
                </button>
                <span className="chore__open"><span>{each.text}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" className="button-quiet" onClick={onEdit}>Add a question</button>
        )}
      </section>
      {visit.notes ? (
        <section className="card">
          <h2 className="card__title card__title--small">Notes</h2>
          <p className="visit-notes">{visit.notes}</p>
        </section>
      ) : (
        <button type="button" className="text-link" onClick={onEdit}>Write notes</button>
      )}
      <button type="button" className="text-link remove-link" onClick={() => {
        removeAppointment(visit.id);
        offerUndo(`${visit.with} removed`, () => putAppointment(visit));
        nav.back();
      }}>Remove</button>
    </div>
  );
}

export default function VisitPage({ nav, id }: { nav: TherapeiaNav; id?: string }) {
  const existing = appointments.use().find((visit) => visit.id === id);
  const [editing, setEditing] = useState(!id);
  if (id && !existing) {
    return (
      <div className="page therapeia-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }
  if (existing && !editing) return <VisitView nav={nav} visit={existing} onEdit={() => setEditing(true)} />;
  return <VisitForm key={existing?.id ?? 'new'} id={id} existing={existing} onDone={() => (existing ? setEditing(false) : nav.back())} />;
}
