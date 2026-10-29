import { useState, type FormEvent } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService } from '../../app/services';
import { MAX_STATEMENT_LENGTH, type CompassStatement, type CompassStatementType } from '../../core/compass/types';
import { Sym } from '../../lamplight/icons';

type Props = {
  type: CompassStatementType;
  title: string;
  statements: CompassStatement[];
};

export default function StatementList({ type, title, statements }: Props) {
  const { offerUndo } = useOverlays();
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
                onClick={async () => {
                  const removal = await compassService.removeStatement(statement.id);
                  offerUndo('Removed', removal.undo);
                }}
              >
                <Sym name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="inline-form" onSubmit={submit}>
        <input
          className="field-input"
          aria-label={`Add to ${title}`}
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
