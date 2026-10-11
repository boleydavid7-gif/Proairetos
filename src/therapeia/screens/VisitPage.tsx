import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { appointments, newId, putAppointment, removeAppointment } from '../app/state';
import type { Appointment } from '../core/medicines';

export default function VisitPage({ nav, id }: { nav: TherapeiaNav; id?: string }) {
  const all = appointments.use();
  const existing = id ? all.find((visit) => visit.id === id) : undefined;
  const [who, setWho] = useState(existing?.with ?? '');
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

  if (id && !existing) {
    return (
      <div className="page therapeia-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this phone.</p>
      </div>
    );
  }

  const build = (patch: Partial<Appointment> = {}): Appointment => ({
    ...(existing ?? { id: newId(), createdAt: new Date().toISOString() }),
    with: who.trim(),
    at: `${day}T${time}`,
    where: where.trim() || undefined,
    questions,
    notes: notes.trim() || undefined,
    ...patch,
  });
  const save = () => {
    putAppointment(build());
    if (existing) offerUndo('Saved', () => putAppointment(existing));
    nav.back();
  };
  // Questions tick off as they are asked, saved at once on a visit already kept.
  const changeQuestions = (next: Appointment['questions']) => {
    setQuestions(next);
    if (existing) putAppointment({ ...existing, questions: next });
  };

  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">{existing ? 'Visit' : 'Add a visit'}</p>
        <button type="button" className="text-link" disabled={!who.trim()} onClick={save}>Save</button>
      </div>

      <label className="field">
        <span className="field__label">Who or what</span>
        <input ref={whoField} className="input" value={who} onChange={(event) => setWho(event.target.value)} placeholder="Dr Patel, blood test" />
      </label>
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

      {existing && (
        <button type="button" className="text-link remove-link" onClick={() => {
          removeAppointment(existing.id);
          offerUndo(`${existing.with} removed`, () => putAppointment(existing));
          nav.back();
        }}>Remove</button>
      )}
    </div>
  );
}
