import { useLeave, useNavigate } from '../../app/navigationContext';
import { directionAlong, transition } from '../../app/transitions';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useEffect, useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService } from '../../app/services';
import CompassRose from '../../components/brand/CompassRose';
import PageHero from '../../components/layout/PageHero';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { describeValue, practiceOfValue } from '../../core/values/descriptions';
import { MAX_USER_VALUES, MAX_VALUE_MEANING_LENGTH, MAX_VALUE_PRINCIPLES, MAX_VALUE_PRINCIPLE_LENGTH, type ChosenValue } from '../../core/values/types';
import StatementList from './StatementList';
import PeopleSection from './PeopleSection';
import ValuePicker from './ValuePicker';
import { valueIcon } from './valueIcons';
import { Sym } from '../../lamplight/icons';
import PursuitsSection, { openPursuit } from './PursuitsSection';
import ValueConnections from './ValueConnections';

function ValueCard({ value, editing, onOpenPursuit }: { value: ChosenValue; editing: boolean; onOpenPursuit: (id: string) => void }) {
  const { offerUndo } = useOverlays();
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState(value.meaning ?? '');
  const [principles, setPrinciples] = useState(value.principles ?? []);
  const [principleDraft, setPrincipleDraft] = useState('');
  const [principleError, setPrincipleError] = useState('');
  const [savingPrinciples, setSavingPrinciples] = useState(false);
  const description = describeValue(value.name);
  const practice = practiceOfValue(value.name);
  const Icon = valueIcon(value.name);

  useEffect(() => {
    setMeaning(value.meaning ?? '');
    setPrinciples(value.principles ?? []);
  }, [value.meaning, value.principles]);

  const saveMeaning = async () => {
    await compassService.updateValue(value.id, { meaning });
  };

  async function savePrinciples(next: string[]) {
    setSavingPrinciples(true);
    setPrincipleError('');
    try {
      const updated = await compassService.updateValue(value.id, { principles: next });
      setPrinciples(updated.principles ?? []);
      return true;
    } catch (cause) {
      setPrincipleError(cause instanceof Error ? cause.message : 'That principle could not be saved.');
      return false;
    } finally {
      setSavingPrinciples(false);
    }
  }

  async function addPrinciple(event: FormEvent) {
    event.preventDefault();
    const principle = principleDraft.trim();
    if (!principle || savingPrinciples) return;
    if (principles.some((item) => item.toLocaleLowerCase() === principle.toLocaleLowerCase())) {
      setPrincipleError('That principle is already here.');
      return;
    }
    if (await savePrinciples([...principles, principle])) setPrincipleDraft('');
  }

  async function removePrinciple(index: number) {
    if (savingPrinciples) return;
    await savePrinciples(principles.filter((_, itemIndex) => itemIndex !== index));
  }

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
          <textarea id={`meaning-${value.id}`} className="field-input field-input--area" rows={3} maxLength={MAX_VALUE_MEANING_LENGTH} value={meaning} onChange={(event) => setMeaning(event.target.value)} />
          <div className="value-card__meaning-actions">
            {practice && <span className="value-card__practice"><span className="daily-line__label">A possible expression</span>{practice}</span>}
            {meaning.trim() !== (value.meaning ?? '') && <button type="button" className="chip chip--small" onClick={() => void saveMeaning()}>Save meaning</button>}
          </div>
          <section className="value-card__principles" aria-label={`Personal principles for ${value.name}`}>
            <div className="value-card__principles-heading">
              <span className="daily-line__label">Your principles</span>
              <span>{principles.length}/{MAX_VALUE_PRINCIPLES}</span>
            </div>
            <p className="value-card__principles-help">Small commitments that show how you want to live this value. They are guides, not rules you have to meet perfectly.</p>
            {principles.length > 0 && (
              <ul className="value-card__principles-list">
                {principles.map((principle, index) => (
                  <li key={`${value.id}-principle-${index}`}>
                    <span>{principle}</span>
                    <button
                      type="button"
                      className="value-card__principle-remove"
                      aria-label={`Remove principle: ${principle}`}
                      disabled={savingPrinciples}
                      onClick={() => void removePrinciple(index)}
                    >
                      <Sym name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {principles.length < MAX_VALUE_PRINCIPLES && (
              <form className="value-card__principle-form" onSubmit={(event) => void addPrinciple(event)}>
                <input
                  className="field-input"
                  aria-label={`Add a personal principle for ${value.name}`}
                  maxLength={MAX_VALUE_PRINCIPLE_LENGTH}
                  placeholder="A small choice I want to practice…"
                  value={principleDraft}
                  onChange={(event) => { setPrincipleDraft(event.target.value); setPrincipleError(''); }}
                />
                <button type="submit" className="chip chip--small" disabled={!principleDraft.trim() || savingPrinciples}>
                  {savingPrinciples ? 'Saving…' : 'Add'}
                </button>
              </form>
            )}
            {principles.length >= MAX_VALUE_PRINCIPLES && <p className="value-card__principles-help">You can keep up to {MAX_VALUE_PRINCIPLES} principles here. Remove one to make room.</p>}
            {principleError && <p className="form-error" role="alert">{principleError}</p>}
          </section>
        </div>
      )}
      {open && !editing && (
        <ValueConnections value={value} onOpenPursuit={onOpenPursuit} />
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

type CompassTab = 'direction' | 'motion' | 'close';

const compassTabs: { id: CompassTab; label: string }[] = [
  { id: 'direction', label: 'Direction' },
  { id: 'motion', label: 'In motion' },
  { id: 'close', label: 'Keep close' },
];

/** The tab last opened, kept on this device only. */
let lastCompassTab: CompassTab = 'direction';

export function openCompassTab(tab: CompassTab): void {
  lastCompassTab = tab;
}

export default function CompassPage() {
  const values = useServiceData(compassService.subscribe, () => compassService.values());
  const statements = useServiceData(compassService.subscribe, () => compassService.statements()) ?? [];
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const shows = useTodayParts();
  // Back (button, gesture, browser) returns where Compass was opened from; Reflect when opened from its address.
  const leave = useLeave('reflect');
  const navigate = useNavigate();
  const tabs = compassTabs.filter((option) => option.id !== 'close' || shows('people') || shows('words'));
  const [chosenTab, chooseTab] = useState<CompassTab>(lastCompassTab);
  // A tab set aside in Settings falls back to direction.
  const tab = tabs.some((option) => option.id === chosenTab) ? chosenTab : 'direction';

  if (!values) return null;
  const canAdd = values.length < MAX_USER_VALUES;

  return (
    <div className="page">
      <PageHero title="Compass" back={{ label: 'Reflect', onBack: leave }} />

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
      {tab === 'direction' && (
      <section className="stack-tight" aria-label="Your values">
        <div className="section-heading">
          <div>
            <h2 className="section-label">Your North</h2>
          </div>
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
          </div>
        )}

        {values.length > 0 && (
          <ul className="value-list">
            {values.map((value) => (
              <ValueCard
                key={value.id}
                value={value}
                editing={editing}
                onOpenPursuit={(id) => {
                  openPursuit(id);
                  lastCompassTab = 'motion';
                  chooseTab('motion');
                }}
              />
            ))}
          </ul>
        )}

        {picking ? (
          <ValuePicker chosen={values} onDone={() => setPicking(false)} />
        ) : (
          (editing || values.length === 0) &&
          (canAdd ? (
            <button type="button" className="chip chip--wide" onClick={() => setPicking(true)}>
              {values.length === 0 ? 'Choose a value' : 'Choose another value'}
            </button>
          ) : (
            <p className="empty-note">Five is the most.</p>
          ))
        )}
      </section>
      )}

      {tab === 'motion' && (
        <section className="compass-motion" aria-label="In motion">
          <PursuitsSection />
        </section>
      )}

      {tab === 'close' && (
        <>
          {shows('people') && <PeopleSection people={statements.filter((statement) => statement.type === 'PERSON')} />}
          {shows('words') && (
          <section className="compass-close-section" aria-label="Words to keep close">
          <StatementList
            type="REMEMBER"
            title="Remember"
            statements={statements.filter((statement) => statement.type === 'REMEMBER')}
          />

          <StatementList
            type="PUSHED_ASIDE"
            title="Set down"
            statements={statements.filter((statement) => statement.type === 'PUSHED_ASIDE')}
          />
          </section>
          )}
        </>
      )}
      </div>

      <button type="button" className="text-link compass-library-link" onClick={() => navigate('connections')}>
        Library <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}
