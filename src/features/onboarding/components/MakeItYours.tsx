import { Sym } from '../../../lamplight/icons';

export type Choices = { name: string; shifts: boolean; intention: string };

type Props = { choices: Choices; onChange: (choices: Choices) => void };

/**
 * Name, one thing that matters today (Today's intention) and whether to set up a schedule next. All can be left empty. Values are not asked for here: Today offers them
 * after a few days, and Compass holds them.
 */
export default function MakeItYours({ choices, onChange }: Props) {
  return (
    <div className="make-yours">
      <label className="make-yours__field">
        <span>Your name</span>
        <input
          className="make-yours__input"
          autoComplete="given-name"
          maxLength={40}
          value={choices.name}
          onChange={(event) => onChange({ ...choices, name: event.target.value })}
        />
      </label>

      <label className="make-yours__field">
        <span>One thing that matters today <em>(optional)</em></span>
        <input
          className="make-yours__input"
          maxLength={120}
          value={choices.intention}
          onChange={(event) => onChange({ ...choices, intention: event.target.value })}
        />
      </label>

      <button
        type="button"
        className="make-yours__toggle"
        aria-pressed={choices.shifts}
        onClick={() => onChange({ ...choices, shifts: !choices.shifts })}
      >
        <span className="make-yours__check" aria-hidden="true">{choices.shifts ? <Sym name="check" size={16} /> : null}</span>
        Set up my schedule next
      </button>
    </div>
  );
}
