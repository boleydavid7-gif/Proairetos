import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { wakeAudio, letGo } from '../../app/sound/engine';
import { player } from '../../app/sound/player';
import { soundCatalogue, soundEntry, type SoundKind } from '../../app/sound/soundscapes';
import SearchButton from '../../components/layout/SearchButton';
import SettingsButton from '../../components/layout/SettingsButton';
import { ChevronRightIcon, ClockIcon, HeartIcon, LeafIcon, LotusIcon, MoonIcon, PlayIcon, StopIcon, TargetIcon } from '../../components/icons/Icons';
import { breathPattern, breathPatterns, patternCounts } from '../../core/meditate/breathing';
import { session, sessionLengths, sessions, type SessionId } from '../../core/meditate/sessions';
import { loadMeditate, saveMeditate, type MeditateSettings } from '../../data/storage/preferences';
import lake from '../../assets/images/scenes/lake.webp';
import BreathCircle from './BreathCircle';
import SitScreen, { type SitPlan } from './SitScreen';
import SoundPicker from './SoundPicker';
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

const breatheLengths = [1, 3, 5, 10] as const;

function soundName(id: string): string {
  return soundEntry(id)?.title ?? 'Silence';
}

/**
 * Meditate: sit for a while with a little guidance, follow a breathing
 * pattern, or just play a sound or some music while you do something else.
 * Nothing is counted or kept; every choice is remembered on this device.
 */
export default function MeditatePage() {
  const [settings, setSettings] = useState(loadMeditate);
  const [sitting, setSitting] = useState<SitPlan | null>(null);
  const [picking, setPicking] = useState<'session' | 'breathe' | null>(null);
  const update = (next: Partial<MeditateSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveMeditate(merged);
  };

  // Sound has to be woken inside the tap itself, or iPhones keep it silent.
  const start = (plan: SitPlan) => {
    wakeAudio();
    if (soundEntry(plan.sound)) player.play(plan.sound);
    setSitting(plan);
    window.setTimeout(letGo, 1000);
  };

  const script = session(settings.session);
  const sessionSound = settings.sessionSound[settings.session] ?? script.sound;
  const pattern = breathPattern(settings.pattern);

  return (
    <div className="page meditate-page">
      <div className="meditate-page__scene" style={{ backgroundImage: `url(${lake})` }} aria-hidden="true" />
      <header className="meditate-page__top">
        <p className="meditate-page__name">Meditate</p>
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
            onClick={() => update({ tab: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settings.tab === 'sessions' && (
        <section className="meditate-panel" aria-label="Sessions">
          <BreathCircle pattern={breathPattern(script.pace)} show="none" />
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
                  onClick={() => update({ session: each.id, minutes: each.minutes })}
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
          <button
            type="button"
            className="meditate-start"
            onClick={() =>
              start({
                kind: 'session',
                id: script.id,
                minutes: settings.minutes,
                sound: sessionSound,
                speak: settings.speak,
                breathSounds: settings.breathSounds,
              })
            }
          >
            <PlayIcon size={22} />
            Start session
          </button>
          <p className="meditate-meta">
            <span>
              <ClockIcon size={16} /> {settings.minutes} min
            </span>
            <span aria-hidden="true">|</span>
            <span>{soundName(sessionSound)}</span>
          </p>
          <div className="meditate-options">
            <div className="chip-row meditate-options__lengths" role="group" aria-label="Length">
              {sessionLengths.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="chip"
                  aria-pressed={settings.minutes === minutes}
                  onClick={() => update({ minutes })}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <button type="button" className="meditate-options__row" onClick={() => setPicking('session')}>
              <span>Sound</span>
              <span className="meditate-options__value">{soundName(sessionSound)}</span>
              <ChevronRightIcon size={16} />
            </button>
            <button
              type="button"
              className="toggle-row"
              aria-pressed={settings.breathSounds}
              onClick={() => update({ breathSounds: !settings.breathSounds })}
            >
              <span className={`toggle-switch${settings.breathSounds ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
              <span className="toggle-row__text">
                <span>Breath sounds</span>
                <span className="toggle-row__detail">A breath in and out, with the circle.</span>
              </span>
            </button>
            <button type="button" className="toggle-row" aria-pressed={settings.speak} onClick={() => update({ speak: !settings.speak })}>
              <span className={`toggle-switch${settings.speak ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
              <span className="toggle-row__text">
                <span>Read the guidance aloud</span>
                <span className="toggle-row__detail">In your phone’s own voice. The words show on screen either way.</span>
              </span>
            </button>
          </div>
          <p className="meditate-source">{script.source}</p>
        </section>
      )}

      {settings.tab === 'breathe' && (
        <section className="meditate-panel" aria-label="Breathe">
          <BreathCircle pattern={pattern} show="none" />
          <button
            type="button"
            className="meditate-start"
            onClick={() =>
              start({
                kind: 'breathe',
                pattern: pattern.id,
                minutes: settings.breatheMinutes,
                sound: settings.breatheSound,
                breathSounds: settings.breathSounds,
              })
            }
          >
            <PlayIcon size={22} />
            Start breathing
          </button>
          <p className="meditate-meta">
            <span>
              <ClockIcon size={16} /> {settings.breatheMinutes} min
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
                aria-checked={settings.pattern === each.id}
                className="breath-patterns__pattern"
                onClick={() => update({ pattern: each.id })}
              >
                <span className="breath-patterns__head">
                  <span className="breath-patterns__title">{each.title}</span>
                  <span className="breath-patterns__counts">{patternCounts(each)}</span>
                </span>
                <span className="breath-patterns__line">{each.line}</span>
              </button>
            ))}
          </div>
          <div className="meditate-options">
            <div className="chip-row meditate-options__lengths" role="group" aria-label="Length">
              {breatheLengths.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="chip"
                  aria-pressed={settings.breatheMinutes === minutes}
                  onClick={() => update({ breatheMinutes: minutes })}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <button type="button" className="meditate-options__row" onClick={() => setPicking('breathe')}>
              <span>Sound</span>
              <span className="meditate-options__value">{soundName(settings.breatheSound)}</span>
              <ChevronRightIcon size={16} />
            </button>
            <button
              type="button"
              className="toggle-row"
              aria-pressed={settings.breathSounds}
              onClick={() => update({ breathSounds: !settings.breathSounds })}
            >
              <span className={`toggle-switch${settings.breathSounds ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
              <span className="toggle-row__text">
                <span>Breath sounds</span>
                <span className="toggle-row__detail">A breath in and out, with the circle.</span>
              </span>
            </button>
          </div>
          <p className="meditate-source">{pattern.source}</p>
        </section>
      )}

      {settings.tab === 'sounds' && <Library kind="sound" />}
      {settings.tab === 'music' && <Library kind="music" />}

      {picking && (
        <SoundPicker
          value={picking === 'session' ? sessionSound : settings.breatheSound}
          onChoose={(id) =>
            picking === 'session'
              ? update({ sessionSound: { ...settings.sessionSound, [settings.session]: id } })
              : update({ breatheSound: id })
          }
          onClose={() => setPicking(null)}
        />
      )}
      {/* Above everything, the tab bar included. */}
      {sitting && createPortal(<SitScreen plan={sitting} onClose={() => setSitting(null)} />, document.body)}
    </div>
  );
}

const timers: { minutes: number | null; label: string }[] = [
  { minutes: null, label: 'Keep playing' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

/** Sounds or music to play on their own, while you do anything else. */
function Library({ kind }: { kind: SoundKind }) {
  const state = useSyncExternalStore(player.subscribe, player.state);
  useEffect(() => {
    void player.prepare();
  }, []);
  const playingNow = state[kind];
  const other = state[kind === 'sound' ? 'music' : 'sound'];

  return (
    <section className="meditate-panel meditate-panel--library" aria-label={kind === 'sound' ? 'Sounds' : 'Music'}>
      <div className="sound-list">
        {soundCatalogue
          .filter((entry) => entry.kind === kind)
          .map((entry) => {
            const Icon = soundIcons[entry.icon];
            const on = playingNow === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                className={`sound-list__row${on ? ' sound-list__row--on' : ''}`}
                aria-pressed={on}
                onClick={() => player.toggle(entry.id)}
              >
                <span className="sound-list__icon">{Icon && <Icon size={24} />}</span>
                <span className="sound-list__text">
                  <span className="sound-list__title">{entry.title}</span>
                  <span className="sound-list__line">
                    {state.problem === entry.id
                      ? 'Could not load this just now. Once it has played here, it plays offline too.'
                      : state.loading === entry.id
                        ? 'Getting it ready…'
                        : entry.line}
                  </span>
                </span>
                {on && state.loading !== entry.id && (
                  <span className="sound-list__bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                <span className="sound-list__play" aria-hidden="true">
                  {on ? <StopIcon size={18} /> : <PlayIcon size={18} />}
                </span>
              </button>
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
        <p className="sheet__label">Stop after</p>
        <div className="chip-row" role="group" aria-label="Stop after">
          {timers.map((timer) => (
            <button
              key={timer.label}
              type="button"
              aria-pressed={state.timer === timer.minutes}
              className="chip"
              onClick={() => player.setTimer(timer.minutes)}
            >
              {timer.label}
            </button>
          ))}
        </div>
        <p className="sheet__hint">
          {other
            ? `${soundName(other)} is playing too. One sound and one piece of music can play together.`
            : `Pick one from ${kind === 'sound' ? 'Music' : 'Sounds'} too, and they play together. It keeps playing while you use the rest of the app.`}
        </p>
      </div>
    </section>
  );
}
