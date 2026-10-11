import { useState } from 'react';
import { initials } from '../core/people';

export function Initials({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`initials${large ? ' initials--large' : ''}`} aria-hidden="true">{initials(name)}</span>;
}

/** A field and a button that adds one line; Enter adds too. */
export function AddLine({ label, onAdd, button = 'Add' }: { label: string; onAdd: (text: string) => void; button?: string }) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <form
      className="add-line"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <input className="input" aria-label={label} placeholder={label} value={text} onChange={(event) => setText(event.target.value)} />
      <button type="submit" className="button-quiet" disabled={!text.trim()}>{button}</button>
    </form>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'long' }));

/** Month and day, with the year optional. */
export function DateFields({ label, value, onChange }: { label: string; value: { month: number; day: number; year?: number }; onChange: (next: { month: number; day: number; year?: number }) => void }) {
  return (
    <fieldset className="field">
      <legend className="field__label">{label}</legend>
      <div className="input-row">
        <select className="input" aria-label="Month" value={value.month || ''} onChange={(event) => onChange({ ...value, month: Number(event.target.value) })}>
          <option value="">Month</option>
          {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </select>
        <select className="input" aria-label="Day" value={value.day || ''} onChange={(event) => onChange({ ...value, day: Number(event.target.value) })}>
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
        </select>
        <input className="input" aria-label="Year (optional)" placeholder="Year" inputMode="numeric" value={value.year ?? ''} onChange={(event) => onChange({ ...value, year: event.target.value ? Number(event.target.value.replace(/\D/g, '').slice(0, 4)) : undefined })} />
      </div>
    </fieldset>
  );
}
