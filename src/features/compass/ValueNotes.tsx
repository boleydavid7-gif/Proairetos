import type { ChosenValue } from '../../core/values/types';

type Props = {
  values: readonly ChosenValue[];
  notes: Record<string, string>;
  title: string;
  onChange: (valueId: string, text: string) => void;
};

export default function ValueNotes({ values, notes, title, onChange }: Props) {
  if (values.length === 0) return null;
  const hasNotes = Object.values(notes).some((note) => note.trim());

  return (
    <details className="value-notes" open={hasNotes}>
      <summary>{title}</summary>
      <div className="value-notes__fields">
        {values.map((value) => (
          <label key={value.id}>
            <span className="sheet__label">{value.name}</span>
            <textarea
              className="field-input field-input--area"
              rows={2}
              value={notes[value.id] ?? ''}
              onChange={(event) => onChange(value.id, event.target.value)}
            />
          </label>
        ))}
      </div>
    </details>
  );
}
