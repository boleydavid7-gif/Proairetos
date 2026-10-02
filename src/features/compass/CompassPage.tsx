import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService } from '../../app/services';
import CompassRose from '../../components/brand/CompassRose';
import PageHero from '../../components/layout/PageHero';
import { describeValue, practiceOfValue } from '../../core/values/descriptions';
import { MAX_USER_VALUES, type ChosenValue } from '../../core/values/types';
import StatementList from './StatementList';
import PeopleSection from './PeopleSection';
import ValuePicker from './ValuePicker';
import { valueIcon } from './valueIcons';

function ValueCard({ value, editing }: { value: ChosenValue; editing: boolean }) {
  const { offerUndo } = useOverlays();
  const [open, setOpen] = useState(false);
  const description = describeValue(value.name);
  const practice = practiceOfValue(value.name);
  const Icon = valueIcon(value.name);

  return (
    <li className="value-card">
      <span className="value-card__icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <button
        type="button"
        className="value-card__text"
        disabled={!practice || editing}
        aria-expanded={practice && !editing ? open : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="value-card__name">{value.name}</span>
        {description && <span className="value-card__detail">{description}</span>}
        {open && practice && !editing && (
          <span className="value-card__practice">
            <span className="daily-line__label">In practice</span>
            {practice}
          </span>
        )}
      </button>
      {editing && (
        <button
          type="button"
          className="value-card__remove"
          aria-label={`Remove ${value.name}`}
          onClick={async () => {
            const removal = await compassService.removeValue(value.id);
            offerUndo(`Removed ${value.name}`, removal.undo);
          }}
        >
          ×
        </button>
      )}
    </li>
  );
}

export default function CompassPage() {
  const values = useServiceData(compassService.subscribe, () => compassService.values());
  const statements = useServiceData(compassService.subscribe, () => compassService.statements()) ?? [];
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!values) return null;
  const canAdd = values.length < MAX_USER_VALUES;

  return (
    <div className="page">
      <PageHero title="Compass" subtitle="Who are you practicing becoming?" focus="peaks" />

      <section className="stack-tight" aria-label="Your values">
        <div className="section-heading">
          <h2 className="section-label">My values</h2>
          {values.length > 0 && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setEditing(!editing);
                setPicking(false);
              }}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {values.length === 0 && !picking && (
          <div className="empty-state empty-state--centered">
            <CompassRose size={80} tone="dark" />
            <p className="empty-state__title">Choose what matters.</p>
            <p className="empty-state__detail">Up to five values. They are yours to choose and change.</p>
          </div>
        )}

        {values.length > 0 && (
          <ul className="value-list">
            {values.map((value) => (
              <ValueCard key={value.id} value={value} editing={editing} />
            ))}
          </ul>
        )}

        {picking ? (
          <ValuePicker chosen={values} onDone={() => setPicking(false)} />
        ) : (
          canAdd &&
          (editing || values.length === 0) && (
            <button type="button" className="chip chip--wide" onClick={() => setPicking(true)}>
              {values.length === 0 ? 'Choose a value' : `Choose another value (${values.length} of ${MAX_USER_VALUES})`}
            </button>
          )
        )}
      </section>

      <StatementList
        type="REMEMBER"
        title="Remember"
        description="Words you want in front of you."
        placeholder="Something to remember"
        statements={statements.filter((statement) => statement.type === 'REMEMBER')}
      />

      <StatementList
        type="PUSHED_ASIDE"
        title="Put aside"
        description="Things you have decided not to carry."
        placeholder="Something to put aside"
        statements={statements.filter((statement) => statement.type === 'PUSHED_ASIDE')}
      />

      <PeopleSection people={statements.filter((statement) => statement.type === 'PERSON')} />
    </div>
  );
}
