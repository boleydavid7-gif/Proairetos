import { useSheet } from '../../components/ui/useSheet';
import { useState } from 'react';
import { focusDurations } from '../../core/focus/session';
import type { FocusTarget } from '../../app/overlays/OverlayContext';

type Props = {
  target?: FocusTarget;
  onStart: (minutes: number) => void;
  onClose: () => void;
};

export default function FocusStart({ target, onStart, onClose }: Props) {
  const { dialog, panel, close } = useSheet();
  const [custom, setCustom] = useState('');


  const start = (minutes: number) => {
    onStart(minutes);
    close();
  };
  const customMinutes = Number(custom);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Start focus"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => close()}>
          Cancel
        </button>
        <p className="sheet__title sheet__title--static">Focus</p>
        <p className="sheet__status">{target ? target.title : 'Just a stretch of time for one thing.'}</p>
        <div className="focus-choices" role="group" aria-label="How long">
          {focusDurations.map((minutes) => (
            <button key={minutes} type="button" className="focus-choice" onClick={() => start(minutes)}>
              <span className="focus-choice__number">{minutes}</span>
              <span>min</span>
            </button>
          ))}
        </div>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (customMinutes >= 1 && customMinutes <= 180) start(customMinutes);
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={180}
            className="field-input"
            aria-label="Other length in minutes"
            placeholder="Other length, in minutes"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!(customMinutes >= 1 && customMinutes <= 180)}>
            Start
          </button>
        </form>
        <p className="sheet__hint">Stop whenever you like. Nothing is counted against you.</p>
      </div>
    </dialog>
  );
}
