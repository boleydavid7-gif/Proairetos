import { useState, type FormEvent } from 'react';
import { compassService } from '../../app/services';
import { MAX_VALUE_NAME_LENGTH, presetValues, stoicVirtues, type ChosenValue } from '../../core/values/types';

type Props = {
  chosen: ChosenValue[];
  onDone: () => void;
};

export default function ValuePicker({ chosen, onDone }: Props) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const taken = new Set(chosen.map((value) => value.name.toLowerCase()));
  const available = presetValues.filter((name) => !taken.has(name.toLowerCase()));

  async function choose(name: string) {
    try {
      await compassService.chooseValue(name);
      setCustom('');
      setError('');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That value could not be added.');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (custom.trim()) choose(custom);
  }

  return (
    <div className="picker">
      <p className="picker__hint">
        Pick ones that ring true, or write your own. Proairetos is Stoic-inspired, but your values are yours.
      </p>
      <div className="stack-tight" role="group" aria-label="Values to choose from">
        {available.some((name) => stoicVirtues.includes(name)) && (
          <>
            <p className="picker__group">The four Stoic virtues</p>
            <div className="chip-row">
              {available
                .filter((name) => stoicVirtues.includes(name))
                .map((name) => (
                  <button key={name} type="button" className="chip" onClick={() => choose(name)}>
                    {name}
                  </button>
                ))}
            </div>
          </>
        )}
        <p className="picker__group">Other values</p>
        <div className="chip-row">
          {available
            .filter((name) => !stoicVirtues.includes(name))
            .map((name) => (
              <button key={name} type="button" className="chip" onClick={() => choose(name)}>
                {name}
              </button>
            ))}
        </div>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input
          className="field-input"
          aria-label="Your own value"
          placeholder="Your own value"
          maxLength={MAX_VALUE_NAME_LENGTH}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
        <button type="submit" className="button-accent" disabled={!custom.trim()}>
          Add
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="button-quiet picker__cancel" onClick={onDone}>
        Cancel
      </button>
    </div>
  );
}
