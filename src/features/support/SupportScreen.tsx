import { useBackHandler } from '../../app/back/backStack';
import { elsewhere, helplinesFor } from './helplines';

/** Reached on purpose, from Settings or Pause. Calm, plain, and always available. */
export default function SupportScreen({ onClose }: { onClose: () => void }) {
  useBackHandler(true, onClose);
  const lines = helplinesFor(typeof navigator === 'undefined' ? 'en-US' : navigator.language);

  return (
    <div className="pause-screen support" role="dialog" aria-modal="true" aria-label="If things feel like too much">
      <div className="support__body">
        <h1 className="support__title">If things feel like too much</h1>
        <p className="support__lead">
          You do not have to carry this alone. Talking with someone can help, at any hour, and these lines are free.
        </p>
        <p className="support__urgent">
          If you are in danger right now, or might act on thoughts of harming yourself, call your local emergency number
          (911, 999, 112, or 000).
        </p>
        <ul className="support__lines">
          {lines.map((line) => (
            <li key={line.name} className="support__line">
              <span className="support__place">{line.place}</span>
              <span className="support__name">{line.name}</span>
              <span className="support__how">{line.how}</span>
              <span className="chip-row">
                {line.tel && (
                  <a className="chip chip--accent" href={`tel:${line.tel}`}>
                    Call
                  </a>
                )}
                {line.sms && (
                  <a className="chip" href={`sms:${line.sms}`}>
                    Text
                  </a>
                )}
              </span>
            </li>
          ))}
          <li className="support__line">
            <span className="support__place">Anywhere else</span>
            <span className="support__name">{elsewhere.name}</span>
            <span className="support__how">{elsewhere.how}</span>
            <span className="chip-row">
              <a className="chip" href={elsewhere.url} target="_blank" rel="noreferrer">
                Open findahelpline.com
              </a>
            </span>
          </li>
        </ul>
        <p className="sheet__hint">
          Proairetos does not read what you write and cannot contact anyone for you. Reaching out is your choice, and a
          brave one.
        </p>
        <button type="button" className="button-quiet" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
