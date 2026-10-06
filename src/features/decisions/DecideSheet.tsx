import { useSheet } from '../../components/ui/useSheet';
import { useState } from 'react';
import { decisionService, lifeService } from '../../app/services';
import { MAX_DECISION_OPTIONS, confidenceLabels, type DecisionConfidence } from '../../core/decisions/types';
import { revisitChoices, revisitDate, type RevisitChoice } from './revisit';

export type DecideFrom = { itemId: string; title: string };

type Props = {
  from?: DecideFrom;
  onClose: () => void;
  onDecided: (decisionId: string) => void;
};

/** Writing down a decision. Every word is the person's; nothing is weighed or suggested. */
export default function DecideSheet({ from, onClose, onDecided }: Props) {
  const { dialog, panel } = useSheet();
  const [question, setQuestion] = useState(from?.title ?? '');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [chosen, setChosen] = useState<number | null>(null);
  const [reasons, setReasons] = useState('');
  const [expected, setExpected] = useState('');
  const [confidence, setConfidence] = useState<DecisionConfidence | undefined>();
  const [revisit, setRevisit] = useState<RevisitChoice>('month');
  const [picked, setPicked] = useState('');
  const [closeItem, setCloseItem] = useState(true);
  const [error, setError] = useState('');


  const filled = options.map((option) => option.trim());
  const canSave = question.trim() && chosen !== null && filled[chosen];

  async function save() {
    if (chosen === null) return;
    try {
      const decision = await decisionService.decide({
        question,
        options: filled,
        choice: filled[chosen],
        reasons,
        expected,
        confidence,
        revisitAt: revisitDate(revisit, picked),
        lifeItemId: from?.itemId,
      });
      if (from) {
        await lifeService.recordDecision(from.itemId, decision.id);
        if (closeItem) await lifeService.setStatus(from.itemId, 'DONE');
      }
      onDecided(decision.id);
      dialog.current?.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That decision could not be saved.');
    }
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Make a decision"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">Make a decision</p>

        <label className="sheet__section">
          <span className="sheet__label">What are you deciding?</span>
          <input className="field-input" value={question} onChange={(event) => setQuestion(event.target.value)} />
        </label>

        <section className="sheet__section" aria-label="Options">
          <p className="sheet__label">The options</p>
          <p className="sheet__hint">Tap the circle next to the one you choose.</p>
          <ul className="option-list">
            {options.map((option, index) => (
              <li key={index} className="option-row">
                <input
                  type="radio"
                  name="choice"
                  aria-label={`Choose option ${index + 1}`}
                  checked={chosen === index}
                  disabled={!option.trim()}
                  onChange={() => setChosen(index)}
                />
                <input
                  className="field-input"
                  aria-label={`Option ${index + 1}`}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) => setOptions(options.map((o, i) => (i === index ? event.target.value : o)))}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => {
                      setOptions(options.filter((_, i) => i !== index));
                      setChosen(chosen === index ? null : chosen !== null && chosen > index ? chosen - 1 : chosen);
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {options.length < MAX_DECISION_OPTIONS && (
            <button type="button" className="chip" onClick={() => setOptions([...options, ''])}>
              + Another option
            </button>
          )}
        </section>

        <label className="sheet__section">
          <span className="sheet__label">Why</span>
          <textarea
            className="field-input field-input--area"
            rows={3}
            placeholder="What you want to remember about this choice"
            value={reasons}
            onChange={(event) => setReasons(event.target.value)}
          />
        </label>

        <section className="sheet__section" aria-label="Expectation">
          <label className="plan-field">
            <span className="sheet__label">What do you expect to happen?</span>
            <input
              className="field-input"
              placeholder="Written now, before you know"
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
            />
          </label>
          <div className="chip-row" role="group" aria-label="How sure">
            {(Object.keys(confidenceLabels) as DecisionConfidence[]).map((level) => (
              <button
                key={level}
                type="button"
                className="chip"
                aria-pressed={confidence === level}
                onClick={() => setConfidence(confidence === level ? undefined : level)}
              >
                {confidenceLabels[level]}
              </button>
            ))}
          </div>
        </section>

        <section className="sheet__section" aria-label="Look back">
          <p className="sheet__label">Look back on it</p>
          <div className="chip-row" role="group" aria-label="When to look back">
            {revisitChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="chip"
                aria-pressed={revisit === choice.id}
                onClick={() => setRevisit(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {revisit === 'date' && (
            <input
              type="date"
              className="field-input"
              aria-label="Look back on"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            />
          )}
        </section>

        {from && (
          <label className="toggle-check">
            <input type="checkbox" checked={closeItem} onChange={(event) => setCloseItem(event.target.checked)} />
            <span>Mark “{from.title}” as done</span>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="sheet__footer">
          <button type="button" className="button-accent" disabled={!canSave} onClick={save}>
            Save decision
          </button>
        </div>
      </div>
    </dialog>
  );
}
