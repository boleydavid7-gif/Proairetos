import { useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService, reflectionService } from '../../app/services';
import MicButton from '../../components/dictation/MicButton';
import { composeThinkThrough, thinkSteps, thinkThroughSource, type ThinkAnswers } from '../../core/practices/thinkThrough';

export type ThinkFrom = { itemId?: string; text?: string };

type Props = {
  from?: ThinkFrom;
  onClose: () => void;
  onSupport: () => void;
};

/**
 * One question at a time, answered in the person's words. Skip any step,
 * leave at any point; at the end they choose to keep it or let it go.
 */
export default function ThinkThroughScreen({ from, onClose, onSupport }: Props) {
  const { offerUndo } = useOverlays();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ThinkAnswers>(() => (from?.text ? { happened: from.text } : {}));
  const [angle, setAngle] = useState(-1);
  const [addStep, setAddStep] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [error, setError] = useState('');
  useBackHandler(true, onClose);

  const finished = index >= thinkSteps.length;
  const step = thinkSteps[Math.min(index, thinkSteps.length - 1)];
  const value = answers[step.id] ?? '';
  const anything = Object.values(answers).some((answer) => answer?.trim());
  const smallStep = answers.step?.trim();

  const move = (to: number) => {
    setIndex(to);
    setAngle(-1);
  };

  async function keep() {
    setError('');
    try {
      const entry = await reflectionService.write({
        body: composeThinkThrough(answers),
        promptKey: 'think-it-through',
        ...(from?.itemId ? { itemId: from.itemId } : {}),
      });
      const item = smallStep && addStep ? await lifeService.capture(smallStep, 'DO') : undefined;
      offerUndo(item ? 'Kept in Reflect, and the step is on your list' : 'Kept in Reflect', async () => {
        await reflectionService.remove(entry.id);
        if (item) await lifeService.deleteItem(item.id);
      });
      onClose();
    } catch {
      setError('Could not keep it just now.');
    }
  }

  return (
    <div className="pause-screen" role="dialog" aria-modal="true" aria-label="Think it through">
      <div className="pause-screen__center practice think">
        <p className="pause-screen__phase">Think it through</p>

        {finished ? (
          <>
            <p className="practice__text">
              {anything ? 'You looked at it from more than one side. That is the whole practice.' : 'Nothing written, and that is fine.'}
            </p>
            {anything && smallStep && (
              <button type="button" className="toggle-row" aria-pressed={addStep} onClick={() => setAddStep(!addStep)}>
                <span className={`toggle-switch${addStep ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
                <span>Put “{smallStep}” on my list</span>
              </button>
            )}
            {error && <p className="form-error">{error}</p>}
            {anything ? (
              <div className="practice__nav">
                <button type="button" className="button-quiet" onClick={onClose}>
                  Let it go
                </button>
                <button type="button" className="button-accent" onClick={keep}>
                  Keep it in Reflect
                </button>
              </div>
            ) : (
              <button type="button" className="button-accent" onClick={onClose}>
                Done
              </button>
            )}
            <button type="button" className="text-link" aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
              Where this comes from
            </button>
            {showSource && <p className="practice__source">{thinkThroughSource}</p>}
            <button type="button" className="text-link practice__support" onClick={onSupport}>
              If it feels like too much, people are there to talk
            </button>
          </>
        ) : (
          <>
            <p className="think__question">{step.question}</p>
            <p className="think__hint">{angle >= 0 && step.angles ? step.angles[angle] : step.hint}</p>
            <div className="think__answer">
              <textarea
                key={step.id}
                className="field-input field-input--area think__text"
                rows={4}
                aria-label={step.question}
                value={value}
                onChange={(event) => setAnswers({ ...answers, [step.id]: event.target.value })}
                autoFocus
              />
              <MicButton onText={(spoken) => setAnswers((current) => ({ ...current, [step.id]: current[step.id] ? `${current[step.id]} ${spoken}` : spoken }))} />
            </div>
            {step.angles && (
              <button type="button" className="text-link" onClick={() => setAngle((angle + 1) % step.angles!.length)}>
                Another way in
              </button>
            )}
            <div className="practice__steps" aria-hidden="true">
              {thinkSteps.map((s, i) => (
                <span key={s.id} className={i === index ? 'practice__dot practice__dot--here' : 'practice__dot'} />
              ))}
            </div>
            <div className="practice__nav">
              {index > 0 && (
                <button type="button" className="button-quiet" onClick={() => move(index - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="button-accent" onClick={() => move(index + 1)}>
                {value.trim() ? 'Next' : 'Skip'}
              </button>
            </div>
            <button type="button" className="button-quiet pause-screen__end" onClick={onClose}>
              End here
            </button>
          </>
        )}
      </div>
    </div>
  );
}
