import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../../app/back/backStack';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { letGo, wakeAudio } from '../../app/sound/engine';
import { player } from '../../app/sound/player';
import { soundCatalogue, soundEntry, type SoundKind } from '../../app/sound/soundscapes';
import { directionAlong, transition } from '../../app/transitions';
import SearchButton from '../../components/layout/SearchButton';
import SettingsButton from '../../components/layout/SettingsButton';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  HeartIcon,
  LeafIcon,
  LotusIcon,
  MoonIcon,
  PlayIcon,
  StopIcon,
  TargetIcon,
} from '../../components/icons/Icons';
import { breathPattern, breathPatterns, patternCounts } from '../../core/meditate/breathing';
import { session, sessionLengths, sessions, type Guidance, type SessionId } from '../../core/meditate/sessions';
import { breatheLengths, isChanged, setupFor, type SitKind, type SitSetup } from '../../core/meditate/setup';
import { loadMeditate, saveMeditate, type MeditateSettings } from '../../data/storage/preferences';
import lake from '../../assets/images/scenes/lake.webp';
import BreathCircle from './BreathCircle';
import SitScreen, { type SitPlan } from './SitScreen';
import { soundIcons } from './soundIcons';

const tabs: { id: MeditateSettings['tab']; label: string }[] = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'breathe', label: 'Breathe' },
  { id: 'sounds', label: 'Sounds' },
  { id: 'music', label: 'Music' },
];

const sessionIcons: Record<SessionId, typeof LotusIcon> = {
  guided: LotusIcon,
  mindfulness: LeafIcon,
  sleep: MoonIcon,
  focus: TargetIcon,
  kindness: HeartIcon,
};

const guidanceLabels: Record<Guidance, string> = {
  often: 'Often',
  some: 'Now and then',
  rarely: 'Rarely',
  none: 'None',
};

function kindTitle(kind: SitKind): string {
  return kind === 'breathe' ? 'Breathing' : session(kind).title;
}

function soundsLine(setup: SitSetup, kind: SoundKind): string {
  const ids = kind === 'sound' ? setup.sounds : setup.music ? [setup.music] : [];
  const names = ids.map((id) => soundEntry(id)?.title).filter(Boolean);
  return names.length ? names.join(', ') : 'None';
}

/** What plays along, in a few words, for the line under Start. */
function alongLine(setup: SitSetup): string {
  const names = [...setup.sounds, ...(setup.music ? [setup.music] : [])]
    .map((id) => soundEntry(id)?.title)
    .filter(Boolean);
  return names.length ? names.join(', ') : 'Silence';
}

/**
 * Meditate: a sit with a little guidance, or a breathing pattern. Each kind
 * of sit is the person's own to set up (length, words, sounds, music,
 * bells); the Sounds and Music tabs choose what plays when it begins, with
 * a preview to hear one first. Nothing about a sit is counted or kept.
 */
export default function MeditatePage() {
  const navigate = useNavigate();
  const { offerUndo } = useOverlays();
  // Back (gesture or button) returns to Reflect; a sit open above takes it first.
  useBackHandler(true, () => navigate('reflect'));
  const [settings, setSettings] = useState(loadMeditate);
  const [sitting, setSitting] = useState<SitPlan | null>(null);
  const [open, setOpen] = useState<SitKind | null>(null);

  // A preview ends when the page does.
  useEffect(() => () => player.stopPreview(), []);

  const save = (next: MeditateSettings) => {
    setSettings(next);
    saveMeditate(next);
  };
  const update = (next: Partial<MeditateSettings>) => save({ ...settings, ...next });
  const setupOf = (kind: SitKind) => setupFor(kind, settings.setups[kind]);
  const change = (kind: SitKind, next: Partial<SitSetup>) =>
    update({ setups: { ...settings.setups, [kind]: { ...settings.setups[kind], ...next } } });
  const reset = (kind: SitKind) => {
    const before = settings;
    const setups = { ...settings.setups };
    delete setups[kind];
    save({ ...settings, setups });
    offerUndo(`${kindTitle(kind)} is back to how it came.`, async () => save(before));
  };
  const showTab = (tab: MeditateSettings['tab'], extra: Partial<MeditateSettings> = {}) =>
    transition(
      directionAlong(
        tabs.map((each) => each.id),
        settings.tab,
        tab,
      ),
      () => update({ tab, ...extra }),
      'panel',
    );

  // Sound has to begin inside the tap itself, or phones keep it silent.
  const start = (kind: SitKind) => {
    const setup = setupOf(kind);
    wakeAudio();
    player.startSit([...setup.sounds, ...(setup.music ? [setup.music] : [])]);
    setSitting({ kind, setup });
    window.setTimeout(letGo, 1000);
  };

  const script = session(settings.session);
  const sessionSetup = setupOf(settings.session);
  const breatheSetup = setupOf('breathe');
  const pattern = breathPattern(breatheSetup.pace);

  return (
    <div className="page meditate-page">
      <div className="meditate-page__scene" style={{ backgroundImage: `url(${lake})` }} aria-hidden="true" />
      <header className="meditate-page__top">
        <button type="button" className="meditate-page__back" onClick={() => navigate('reflect')}>
          <ArrowLeftIcon size={22} />
          <span>Meditate</span>
        </button>
        <div className="meditate-page__actions">
          <SearchButton />
          <SettingsButton />
        </div>
      </header>
      <div className="meditate-page__hero">
        <h1 className="meditate-page__title">Take a breath</h1>
        <p className="meditate-page__subtitle">Nothing to get right.</p>
      </div>

      <div className="meditate-tabs" role="tablist" aria-label="Meditate">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={settings.tab === tab.id}
            className="meditate-tabs__tab"
            onClick={() => showTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settings.tab === 'sessions' && (
        <section className="meditate-panel vt-panel" aria-label="Sessions">
          <BreathCircle pattern={breathPattern(sessionSetup.pace)} show="none" />
          <div className="session-kinds" role="radiogroup" aria-label="Kind of session">
            {sessions.map((each) => {
              const Icon = sessionIcons[each.id];
              return (
                <button
                  key={each.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.session === each.id}
                  className="session-kinds__kind"
                  onClick={() => update({ session: each.id, soundsFor: each.id })}
                >
                  <span className="session-kinds__icon">
                    <Icon size={24} />
                  </span>
                  <span>{each.title}</span>
                </button>
              );
            })}
          </div>
          <p className="meditate-panel__line">{script.line}</p>
          <button type="button" className="meditate-start" onClick={() => start(settings.session)}>
            <PlayIcon size={22} />
            Start session
          </button>
          <p className="meditate-meta">
            <span>
              <ClockIcon size={16} /> {sessionSetup.minutes} min
            </span>
            <span aria-hidden="true">|</span>
            <span>{alongLine(sessionSetup)}</span>
          </p>
          <Customize
            kind={settings.session}
            setup={sessionSetup}
            changed={isChanged(settings.session, settings.setups[settings.session])}
            open={open === settings.session}
            onOpen={(yes) => setOpen(yes ? settings.session : null)}
            onChange={(next) => change(settings.session, next)}
            onReset={() => reset(settings.session)}
            onSounds={(kind) => showTab(kind === 'sound' ? 'sounds' : 'music', { soundsFor: settings.session })}
          />
          <p className="meditate-source">{script.source}</p>
        </section>
      )}

      {settings.tab === 'breathe' && (
        <section className="meditate-panel vt-panel" aria-label="Breathe">
          <BreathCircle pattern={pattern} show="none" />
          <button type="button" className="meditate-start" onClick={() => start('breathe')}>
            <PlayIcon size={22} />
            Start breathing
          </button>
          <p className="meditate-meta">
            <span>
              <ClockIcon size={16} /> {breatheSetup.minutes} min
            </span>
            <span aria-hidden="true">|</span>
            <span>{patternCounts(pattern)}</span>
          </p>
          <div className="breath-patterns" role="radiogroup" aria-label="Pattern">
            {breathPatterns.map((each) => (
              <button
                key={each.id}
                type="button"
                role="radio"
                aria-checked={breatheSetup.pace === each.id}
                className="breath-patterns__pattern"
                onClick={() => change('breathe', { pace: each.id })}
              >
                <span className="breath-patterns__head">
                  <span className="breath-patterns__title">{each.title}</span>
                  <span className="breath-patterns__counts">{patternCounts(each)}</span>
                </span>
                <span className="breath-patterns__line">{each.line}</span>
              </button>
            ))}
          </div>
          <Customize
            kind="breathe"
            setup={breatheSetup}
            changed={isChanged('breathe', settings.setups.breathe)}
            open={open === 'breathe'}
            onOpen={(yes) => setOpen(yes ? 'breathe' : null)}
            onChange={(next) => change('breathe', next)}
            onReset={() => reset('breathe')}
            onSounds={(kind) => showTab(kind === 'sound' ? 'sounds' : 'music', { soundsFor: 'breathe' })}
          />
          <p className="meditate-source">{pattern.source}</p>
        </section>
      )}

      {(settings.tab === 'sounds' || settings.tab === 'music') && (
        <Library
          key={settings.tab}
          kind={settings.tab === 'sounds' ? 'sound' : 'music'}
          sitKind={settings.soundsFor}
          setup={setupOf(settings.soundsFor)}
          onFor={(soundsFor) => update({ soundsFor })}
          onChange={(next) => change(settings.soundsFor, next)}
        />
      )}

      {/* Above everything, the tab bar included. */}
      {sitting && createPortal(<SitScreen plan={sitting} onClose={() => setSitting(null)} />, document.body)}
    </div>
  );
}

function Switch({
  on,
  label,
  detail,
  onToggle,
}: {
  on: boolean;
  label: string;
  detail?: string;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="toggle-row" role="switch" aria-checked={on} aria-pressed={on} onClick={onToggle}>
      <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
      <span className="toggle-row__text">
        <span>{label}</span>
        {detail && <span className="toggle-row__detail">{detail}</span>}
      </span>
    </button>
  );
}

/** One kind of sit, made the person's own. Folded until opened. */
function Customize({
  kind,
  setup,
  changed,
  open,
  onOpen,
  onChange,
  onReset,
  onSounds,
}: {
  kind: SitKind;
  setup: SitSetup;
  changed: boolean;
  open: boolean;
  onOpen: (open: boolean) => void;
  onChange: (next: Partial<SitSetup>) => void;
  onReset: () => void;
  onSounds: (kind: SoundKind) => void;
}) {
  const lengths: readonly number[] = kind === 'breathe' ? breatheLengths : sessionLengths;
  return (
    <div className="meditate-options customize">
      <button type="button" className="customize__head" aria-expanded={open} onClick={() => onOpen(!open)}>
        <span>Make {kindTitle(kind)} your own</span>
        <ChevronRightIcon size={18} className="customize__chevron" />
      </button>
      {open && (
        <div className="customize__body">
          <p className="sheet__label">Length</p>
          <div className="chip-row meditate-options__lengths" role="group" aria-label="Length">
            {lengths.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="chip"
                aria-pressed={setup.minutes === minutes}
                onClick={() => onChange({ minutes })}
              >
                {minutes} min
              </button>
            ))}
          </div>

          {kind !== 'breathe' && (
            <>
              <p className="sheet__label">Words</p>
              <div className="chip-row" role="group" aria-label="How often words come">
                {(Object.keys(guidanceLabels) as Guidance[]).map((guidance) => (
                  <button
                    key={guidance}
                    type="button"
                    className="chip"
                    aria-pressed={setup.guidance === guidance}
                    onClick={() => onChange({ guidance })}
                  >
                    {guidanceLabels[guidance]}
                  </button>
                ))}
              </div>
              {setup.guidance !== 'none' && (
                <Switch
                  on={setup.speak}
                  label="Read them aloud"
                  detail="In your phone’s own voice. They show on screen either way."
                  onToggle={() => onChange({ speak: !setup.speak })}
                />
              )}
              <p className="sheet__label">The circle’s pace</p>
              <div className="chip-row" role="group" aria-label="The circle’s pace">
                {breathPatterns.map((each) => (
                  <button
                    key={each.id}
                    type="button"
                    className="chip"
                    aria-pressed={setup.pace === each.id}
                    onClick={() => onChange({ pace: each.id })}
                  >
                    {each.title}
                  </button>
                ))}
              </div>
            </>
          )}

          <Switch
            on={setup.counts}
            label="Counts in the circle"
            detail="Breathe in, 4, 3… Otherwise the time left."
            onToggle={() => onChange({ counts: !setup.counts })}
          />
          <Switch
            on={setup.breathSounds}
            label="Breath sounds"
            detail="A breath in and out, with the circle."
            onToggle={() => onChange({ breathSounds: !setup.breathSounds })}
          />
          <Switch
            on={setup.bells}
            label="Bell at the start and end"
            onToggle={() => onChange({ bells: !setup.bells })}
          />
          <button type="button" className="meditate-options__row" onClick={() => onSounds('sound')}>
            <span>Sounds</span>
            <span className="meditate-options__value">{soundsLine(setup, 'sound')}</span>
            <ChevronRightIcon size={16} />
          </button>
          <button type="button" className="meditate-options__row" onClick={() => onSounds('music')}>
            <span>Music</span>
            <span className="meditate-options__value">{soundsLine(setup, 'music')}</span>
            <ChevronRightIcon size={16} />
          </button>
          {changed && (
            <button type="button" className="text-link customize__reset" onClick={onReset}>
              Back to how it came
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const forKinds: readonly SitKind[] = [...sessions.map((each) => each.id), 'breathe'];

/**
 * What plays when a kind of sit begins: switch any sounds on (they layer),
 * and one piece of music. Preview plays one on its own for a short while.
 */
function Library({
  kind,
  sitKind,
  setup,
  onFor,
  onChange,
}: {
  kind: SoundKind;
  sitKind: SitKind;
  setup: SitSetup;
  onFor: (kind: SitKind) => void;
  onChange: (next: Partial<SitSetup>) => void;
}) {
  const state = useSyncExternalStore(player.subscribe, player.state);
  useEffect(() => {
    void player.prepare();
  }, []);

  const isOn = (id: string) => (kind === 'sound' ? setup.sounds.includes(id) : setup.music === id);
  const toggle = (id: string) => {
    if (kind === 'music') onChange({ music: setup.music === id ? null : id });
    else onChange({ sounds: isOn(id) ? setup.sounds.filter((each) => each !== id) : [...setup.sounds, id] });
  };

  return (
    <section
      className="meditate-panel meditate-panel--library vt-panel"
      aria-label={kind === 'sound' ? 'Sounds' : 'Music'}
    >
      <div className="meditate-for">
        <p className="sheet__label">Plays during</p>
        <div className="chip-row meditate-for__kinds" role="group" aria-label="Plays during">
          {forKinds.map((each) => (
            <button
              key={each}
              type="button"
              className="chip"
              aria-pressed={sitKind === each}
              onClick={() => onFor(each)}
            >
              {kindTitle(each)}
            </button>
          ))}
        </div>
      </div>

      <div className="sound-list">
        {soundCatalogue
          .filter((entry) => entry.kind === kind)
          .map((entry) => {
            const Icon = soundIcons[entry.icon];
            const on = isOn(entry.id);
            const previewing = state.preview === entry.id;
            return (
              <div key={entry.id} className={`sound-list__row${on ? ' sound-list__row--on' : ''}`}>
                <span className="sound-list__icon">{Icon && <Icon size={24} />}</span>
                <span className="sound-list__text">
                  <span className="sound-list__title">{entry.title}</span>
                  <span className="sound-list__line">
                    {state.problem === entry.id
                      ? 'Could not load this just now. Once it has played here, it plays offline too.'
                      : previewing && state.loading.includes(entry.id)
                        ? 'Getting it ready…'
                        : entry.line}
                  </span>
                </span>
                <button
                  type="button"
                  className={`sound-list__preview${previewing ? ' sound-list__preview--on' : ''}`}
                  aria-label={previewing ? `Stop the preview of ${entry.title}` : `Preview ${entry.title}`}
                  onClick={() => player.preview(entry.id)}
                >
                  {previewing ? <StopIcon size={16} /> : <PlayIcon size={16} />}
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${entry.title} during ${kindTitle(sitKind)}`}
                  className="sound-list__switch"
                  onClick={() => toggle(entry.id)}
                >
                  <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
                </button>
              </div>
            );
          })}
      </div>

      <div className="meditate-options">
        <label className="volume">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.volume[kind]}
            onChange={(event) => player.setVolume(kind, Number(event.target.value))}
          />
        </label>
        <p className="sheet__hint">
          {kind === 'sound'
            ? `Switched on, it plays when ${kindTitle(sitKind)} begins. Switch on a few and they play together.`
            : `Switched on, it plays when ${kindTitle(sitKind)} begins. One piece at a time.`}
        </p>
      </div>
    </section>
  );
}
