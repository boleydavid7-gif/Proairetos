import { useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { practiceById, practices, type PracticeId } from '../../core/practices/practices';

type Props = {
  /** Opens straight into one practice; otherwise shows the short list first. */
  practiceId?: PracticeId;
  onClose: () => void;
};

/** One step at a time, at the person's own pace. Leavable at any point. */
export default function PracticeScreen({ practiceId, onClose }: Props) {
  const [chosen, setChosen] = useState<PracticeId | undefined>(practiceId);
  const [step, setStep] = useState(0);
  const [showSource, setShowSource] = useState(false);

  // Back steps back through the practice, then to the list, then out.
  useBackHandler(true, () => {
    if (chosen && step > 0) setStep(step - 1);
    else if (chosen && !practiceId) setChosen(undefined);
    else onClose();
  });

  if (!chosen) {
    return (
      <div className="pause-screen" role="dialog" aria-modal="true" aria-label="Ways to pause">
        <div className="pause-screen__center practice">
          <p className="pause-screen__title">Another way to pause</p>
          <ul className="practice-list">
            {practices.map((practice) => (
              <li key={practice.id}>
                <button
                  type="button"
                  className="practice-list__item"
                  onClick={() => {
                    setChosen(practice.id);
                    setStep(0);
                    setShowSource(false);
                  }}
                >
                  <span className="practice-list__title">{practice.title}</span>
                  <span className="practice-list__line">{practice.line}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="button-quiet" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const practice = practiceById(chosen);
  const finished = step >= practice.steps.length;

  return (
    <div className="pause-screen" role="dialog" aria-modal="true" aria-label={practice.title}>
      <div className="pause-screen__center practice">
        <p className="pause-screen__phase">{practice.title}</p>
        {finished ? (
          <>
            <p className="practice__text">{practice.close}</p>
            <button type="button" className="button-accent" onClick={onClose}>
              Done
            </button>
            <button type="button" className="text-link" aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
              Where this comes from
            </button>
            {showSource && <p className="practice__source">{practice.source}</p>}
          </>
        ) : (
          <>
            <p className="practice__text" aria-live="polite">
              {practice.steps[step]}
            </p>
            <div className="practice__steps" aria-hidden="true">
              {practice.steps.map((_, index) => (
                <span key={index} className={index === step ? 'practice__dot practice__dot--here' : 'practice__dot'} />
              ))}
            </div>
            <button type="button" className="button-accent" onClick={() => setStep(step + 1)}>
              {step === practice.steps.length - 1 ? 'Finish' : 'Next'}
            </button>
            <button type="button" className="button-quiet pause-screen__end" onClick={onClose}>
              End here
            </button>
          </>
        )}
      </div>
    </div>
  );
}
