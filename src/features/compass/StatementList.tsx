import { useState, type FormEvent } from 'react';
import { compassService } from '../../app/services';
import { MAX_STATEMENT_LENGTH, type CompassStatement, type CompassStatementType } from '../../core/compass/types';

type Props = {
  type: CompassStatementType;
  title: string;
  description: string;
  placeholder: string;
  statements: CompassStatement[];
};

export default function StatementList({ type, title, description, placeholder, statements }: Props) {
  const [draft, setDraft] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft;
    if (!value.trim()) return;
    setDraft('');
    try {
      await compassService.writeStatement(type, value);
    } catch {
      setDraft((current) => current || value);
    }
  }

  return (
    <section className="stack-tight" aria-label={title}>
      <div>
        <h2 className="section-label">{title}</h2>
        <p className="section-description">{description}</p>
      </div>
      {statements.length > 0 && (
        <ul className="statement-list">
          {statements.map((statement) => (
            <li key={statement.id} className="statement">
              <span className="statement__body">{statement.body}</span>
              <button
                type="button"
                className="statement__remove"
                aria-label={`Remove "${statement.body}"`}
                onClick={() => compassService.removeStatement(statement.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="inline-form" onSubmit={submit}>
        <input
          className="field-input"
          aria-label={placeholder}
          placeholder={placeholder}
          maxLength={MAX_STATEMENT_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="button-accent" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </section>
  );
}
