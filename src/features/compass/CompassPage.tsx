import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { compassService } from '../../app/services';
import CompassRose from '../../components/brand/CompassRose';
import PageHeader from '../../components/layout/PageHeader';
import { MAX_USER_VALUES, type ChosenValue } from '../../core/values/types';
import StatementList from './StatementList';
import ValuePicker from './ValuePicker';

function ValueCard({ value }: { value: ChosenValue }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="value-card">
      <span className="value-card__name">{value.name}</span>
      {confirming ? (
        <span className="value-card__confirm">
          <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
            Keep
          </button>
          <button type="button" className="chip" onClick={() => compassService.removeValue(value.id)}>
            Remove
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="value-card__remove"
          aria-label={`Remove ${value.name}`}
          onClick={() => setConfirming(true)}
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

  if (!values) return null;
  const canAdd = values.length < MAX_USER_VALUES;

  return (
    <div className="page">
      <PageHeader title="Compass" subtitle="Keep sight of what matters to you." />

      <section className="stack-tight" aria-label="Your values">
        <div className="section-heading">
          <h2 className="section-label">Your values</h2>
          <span className="section-count">
            {values.length} of {MAX_USER_VALUES}
          </span>
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
              <ValueCard key={value.id} value={value} />
            ))}
          </ul>
        )}

        {picking ? (
          <ValuePicker chosen={values} onDone={() => setPicking(false)} />
        ) : (
          canAdd && (
            <button type="button" className="chip chip--wide" onClick={() => setPicking(true)}>
              {values.length === 0 ? 'Choose a value' : 'Choose another value'}
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
    </div>
  );
}
