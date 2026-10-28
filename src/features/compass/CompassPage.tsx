import { useBackHandler } from '../../app/back/backStack';
import { useNavigate } from '../../app/navigationContext';
import { directionAlong, transition } from '../../app/transitions';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useEffect, useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService } from '../../app/services';
import CompassRose from '../../components/brand/CompassRose';
import PageHero from '../../components/layout/PageHero';
import { describeValue, practiceOfValue } from '../../core/values/descriptions';
import { MAX_USER_VALUES, MAX_VALUE_MEANING_LENGTH, type ChosenValue } from '../../core/values/types';
import StatementList from './StatementList';
import PeopleSection from './PeopleSection';
import ValuePicker from './ValuePicker';
import { valueIcon } from './valueIcons';
import { Sym } from '../../lamplight/icons';
import PursuitsSection from './PursuitsSection';

function ValueCard({ value, editing }: { value: ChosenValue; editing: boolean }) {
  const { offerUndo } = useOverlays();
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState(value.meaning ?? '');
  const description = describeValue(value.name);
  const practice = practiceOfValue(value.name);
  const Icon = valueIcon(value.name);

  useEffect(() => setMeaning(value.meaning ?? ''), [value.meaning]);

  const saveMeaning = async () => {
    await compassService.updateValue(value.id, { meaning });
  };

  return (
    <li className="value-card">
      <span className="value-card__icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <button
        type="button"
        className="value-card__text"
        disabled={editing}
        aria-expanded={!editing ? open : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="value-card__name">{value.name}</span>
        {(value.meaning || description) && <span className="value-card__detail">{value.meaning || description}</span>}
      </button>
      {open && !editing && (
        <div className="value-card__meaning">
          <label className="daily-line__label" htmlFor={`meaning-${value.id}`}>What does this value mean to you?</label>
          <textarea id={`meaning-${value.id}`} className="field-input field-input--area" rows={3} maxLength={MAX_VALUE_MEANING_LENGTH} placeholder="In my life, this means…" value={meaning} onChange={(event) => setMeaning(event.target.value)} />
          <div className="value-card__meaning-actions">
            {practice && <span className="value-card__practice"><span className="daily-line__label">A possible expression</span>{practice}</span>}
            {meaning.trim() !== (value.meaning ?? '') && <button type="button" className="chip chip--small" onClick={() => void saveMeaning()}>Save meaning</button>}
          </div>
        </div>
      )}
      {editing && (
        <button
          type="button"
          className="value-card__remove"
          aria-label={`Remove ${value.name}`}
          onClick={async () => {
            const removal = await compassService.removeValue(value.id);
            offerUndo(`“${value.name}” removed`, removal.undo);
          }}
        >
          <Sym name="close" />
        </button>
      )}
    </li>
  );
}

type CompassTab = 'values' | 'pursuits' | 'people' | 'words';

const compassTabs: { id: CompassTab; label: string }[] = [
  { id: 'values', label: 'Values' },
  { id: 'pursuits', label: 'Pursuits' },
  { id: 'people', label: 'People' },
  { id: 'words', label: 'Words' },
];

/** The tab last opened, kept on this device only. */
let lastCompassTab: CompassTab = 'values';

export default function CompassPage() {
  const values = useServiceData(compassService.subscribe, () => compassService.values());
  const statements = useServiceData(compassService.subscribe, () => compassService.statements()) ?? [];
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const shows = useTodayParts();
  // Compass opens from Reflect; back (button, gesture, browser) returns there.
  const navigate = useNavigate();
  useBackHandler(true, () => navigate('reflect'));
  const tabs = compassTabs.filter((option) => option.id === 'values' || option.id === 'pursuits' || shows(option.id));
  const [chosenTab, chooseTab] = useState<CompassTab>(lastCompassTab);
  // A tab set aside in Settings falls back to values.
  const tab = tabs.some((option) => option.id === chosenTab) ? chosenTab : 'values';

  if (!values) return null;
  const canAdd = values.length < MAX_USER_VALUES;

  return (
    <div className="page">
      <PageHero title="Compass" back={{ label: 'Reflect', onBack: () => navigate('reflect') }} />

      {tabs.length > 1 && (
        <div className="segmented compass-tabs" role="tablist" aria-label="Compass" style={{ ['--tabs' as string]: String(tabs.length) }}>
          {tabs.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              className="segmented__option"
              aria-selected={tab === option.id}
              onClick={() => {
                lastCompassTab = option.id;
                transition(
                  directionAlong(
                    tabs.map((each) => each.id),
                    tab,
                    option.id,
                  ),
                  () => chooseTab(option.id),
                  'panel',
                );
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div key={tab} className="vt-panel">
      {tab === 'values' && (
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
            <p className="empty-state__title">Choose what matters</p>
            <p className="empty-state__detail">Up to five values.</p>
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
      )}

      {tab === 'pursuits' && <PursuitsSection />}

      {tab === 'words' && (
        <>
          <StatementList
            type="REMEMBER"
            title="Worth getting up for"
            description="Small things that make life worth living."
            placeholder="First light on the river, a call with Sam…"
            statements={statements.filter((statement) => statement.type === 'REMEMBER')}
          />

          <StatementList
            type="PUSHED_ASIDE"
            title="Put aside"
            description="Things you have decided not to carry."
            placeholder="Something to put aside"
            statements={statements.filter((statement) => statement.type === 'PUSHED_ASIDE')}
          />
        </>
      )}

      {tab === 'people' && <PeopleSection people={statements.filter((statement) => statement.type === 'PERSON')} />}
      </div>
    </div>
  );
}
