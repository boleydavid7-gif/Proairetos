import { MAX_USER_VALUES, presetValues } from '../../../core/values/types';

export type Choices = { name: string; values: string[]; shifts: boolean };

type Props = { choices: Choices; onChange: (choices: Choices) => void };

/** Name, up to five values, and whether to set up a schedule next. Every part can be left empty. */
export default function MakeItYours({ choices, onChange }: Props) {
  const toggleValue = (name: string) =>
    onChange({
      ...choices,
      values: choices.values.includes(name) ? choices.values.filter((v) => v !== name) : [...choices.values, name],
    });

  return (
    <div className="make-yours">
      <label className="make-yours__field">
        <span>Your name</span>
        <input
          className="make-yours__input"
          autoComplete="given-name"
          maxLength={40}
          placeholder="For the greeting on Today"
          value={choices.name}
          onChange={(event) => onChange({ ...choices, name: event.target.value })}
        />
      </label>

      <div className="make-yours__field" role="group" aria-label="Values, up to five">
        <span>
          Values, up to {MAX_USER_VALUES} <em>{choices.values.length > 0 ? `${choices.values.length} chosen` : ''}</em>
        </span>
        <div className="make-yours__chips">
          {presetValues.map((name) => {
            const chosen = choices.values.includes(name);
            return (
              <button
                key={name}
                type="button"
                className="make-yours__chip"
                aria-pressed={chosen}
                disabled={!chosen && choices.values.length >= MAX_USER_VALUES}
                onClick={() => toggleValue(name)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="make-yours__toggle"
        aria-pressed={choices.shifts}
        onClick={() => onChange({ ...choices, shifts: !choices.shifts })}
      >
        <span className="make-yours__check" aria-hidden="true">{choices.shifts ? '✓' : ''}</span>
        Set up my schedule next
      </button>
    </div>
  );
}
