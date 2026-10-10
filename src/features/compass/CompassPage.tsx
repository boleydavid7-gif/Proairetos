import { directionAlong, transition } from '../../app/transitions';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService } from '../../app/services';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import CompassRose from '../../components/brand/CompassRose';
import PageHero from '../../components/layout/PageHero';
import { describeValue, practiceOfValue } from '../../core/values/descriptions';
import { MAX_USER_VALUES, type ChosenValue } from '../../core/values/types';
import StatementList from './StatementList';
import PeopleSection from './PeopleSection';
import GoalsSection from './GoalsSection';
import ValuePicker from './ValuePicker';
import { valueIcon } from './valueIcons';

/**
 * Offered when a value is opened: one small thing for today, in the
 * person's own words. Saved for today and linked to the value. No answer
 * is asked for; leaving it empty is fine.
 */
function HonourToday({ value }: { value: ChosenValue }) {
  const { offerUndo } = useOverlays();
  const { today } = usePersonalDay(useClock());
  const [text, setText] = useState('');

  async function save() {
    const title = text.trim();
    if (!title) return;
    setText('');
    const item = await lifeService.capture(title, 'DO', { plannedFor: today });
    await lifeService.connectValue(item.id, value.id);
    offerUndo(`For today: ${title}`, async () => {
      await lifeService.deleteItem(item.id);
    });
  }

  return (
    <form
      className="value-card__today"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="daily-line__label" htmlFor={`honour-${value.id}`}>
        What would {value.name.toLowerCase()} look like today?
      </label>
      <div className="field-row">
        <input
          id={`honour-${value.id}`}
          className="field-input"
          placeholder="One small thing"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {text.trim() && (
          <button type="submit" className="chip chip--small">
            Add
          </button>
        )}
      </div>
    </form>
  );
}

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
        disabled={editing}
        aria-expanded={!editing ? open : undefined}
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
      {open && !editing && <HonourToday value={value} />}
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

type CompassTab = 'values' | 'goals' | 'people' | 'words';

const compassTabs: { id: CompassTab; label: string }[] = [
  { id: 'values', label: 'Values' },
  { id: 'goals', label: 'Goals' },
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
  const tabs = compassTabs.filter((option) => option.id === 'values' || shows(option.id));
  const [chosenTab, chooseTab] = useState<CompassTab>(lastCompassTab);
  // A tab set aside in Settings falls back to values.
  const tab = tabs.some((option) => option.id === chosenTab) ? chosenTab : 'values';

  if (!values) return null;
  const canAdd = values.length < MAX_USER_VALUES;

  return (
    <div className="page">
      <PageHero title="Compass" focus="peaks" />

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
            <p className="empty-state__title">Choose what matters.</p>
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

      {tab === 'goals' && <GoalsSection goals={statements.filter((statement) => statement.type === 'GOAL')} />}

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
