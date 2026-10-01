import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { decisionService, reflectionService } from '../../app/services';
import { toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';
import { revisitChoices, revisitDate, type RevisitChoice } from './revisit';

type Props = {
  decisionId: string;
  onClose: () => void;
};

const day = (iso: string) => formatLocalDay(toLocalDate(new Date(iso)), { month: 'short', day: 'numeric', year: 'numeric' });

/** Looking back on a decision: what was chosen, why, and notes written since. */
export default function DecisionSheet({ decisionId, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const decision = useServiceData(decisionService.subscribe, () => decisionService.get(decisionId), [decisionId]);
  const notes = useServiceData(reflectionService.subscribe, () => reflectionService.forDecision(decisionId), [decisionId]) ?? [];
  const [draft, setDraft] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [picked, setPicked] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  const close = () => dialog.current?.close();
  const due = decision?.revisitAt && !decision.revisitedAt && decision.revisitAt <= new Date().toISOString();

  async function addNote(event: FormEvent) {
    event.preventDefault();
    const body = draft;
    if (!body.trim()) return;
    setDraft('');
    await reflectionService.write({ body, kind: 'DECISION_FOLLOWUP', decisionId, promptKey: 'decision-followup' });
  }

  async function reschedule(choice: RevisitChoice) {
    if (choice === 'date' && !picked) return;
    await decisionService.setRevisit(decisionId, revisitDate(choice, picked));
    setRescheduling(false);
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Decision"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        {decision === null && <p className="empty-note">This decision is no longer here.</p>}
        {decision && (
          <>
            <p className="sheet__title sheet__title--static">{decision.question}</p>
            <p className="sheet__status">Decided {day(decision.decidedAt)}</p>

            <section className="decision-choice" aria-label="Your choice">
              <span className="sheet__label">You chose</span>
              <span className="decision-choice__text">{decision.choice}</span>
              {decision.options.length > 1 && (
                <span className="decision-choice__others">
                  Also considered: {decision.options.filter((o) => o !== decision.choice).join(', ')}
                </span>
              )}
            </section>

            {decision.reasons && (
              <section className="sheet__section" aria-label="Why">
                <p className="sheet__label">Why</p>
                <p className="decision-reasons">{decision.reasons}</p>
              </section>
            )}

            <section className="sheet__section" aria-label="Looking back">
              <p className="sheet__label">Looking back</p>
              {notes.map((note) => (
                <article key={note.id} className="decision-note">
                  <time dateTime={note.createdAt}>{day(note.createdAt)}</time>
                  <p>{note.body}</p>
                </article>
              ))}
              <form className="stack-tight decision-note-form" onSubmit={addNote}>
                <textarea
                  className="field-input field-input--area"
                  rows={3}
                  aria-label="Note on this decision"
                  placeholder="How it turned out, or what you notice now"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" className="chip chip--accent chip--wide" disabled={!draft.trim()}>
                  Add note
                </button>
              </form>
            </section>

            <section className="sheet__section" aria-label="Revisit">
              <p className="sheet__hint">
                {decision.revisitedAt
                  ? `Finished looking back ${day(decision.revisitedAt)}.`
                  : decision.revisitAt
                    ? `${due ? 'Ready to look back since' : 'You will look back on'} ${day(decision.revisitAt)}.`
                    : 'No look-back date.'}
              </p>
              {rescheduling ? (
                <>
                  <div className="chip-row" role="group" aria-label="When to look back">
                    {revisitChoices.map((choice) => (
                      <button key={choice.id} type="button" className="chip" onClick={() => reschedule(choice.id)}>
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <input type="date" className="field-input" aria-label="Look back on" value={picked} onChange={(e) => setPicked(e.target.value)} />
                </>
              ) : (
                <div className="chip-row">
                  {due && (
                    <button type="button" className="chip chip--accent" onClick={() => decisionService.finishRevisiting(decisionId)}>
                      Done looking back
                    </button>
                  )}
                  <button type="button" className="chip" onClick={() => setRescheduling(true)}>
                    {decision.revisitAt ? 'Change look-back date' : 'Set a look-back date'}
                  </button>
                </div>
              )}
            </section>

            <div className="sheet__footer">
              {confirmingDelete ? (
                <>
                  <button type="button" className="button-quiet" onClick={() => setConfirmingDelete(false)}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={async () => {
                      await decisionService.remove(decisionId);
                      close();
                    }}
                  >
                    Delete decision
                  </button>
                </>
              ) : (
                <button type="button" className="button-quiet" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
