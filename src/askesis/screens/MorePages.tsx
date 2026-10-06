import { useState } from 'react';
import FamilyBackup from '../../app/family/FamilyBackup';
import AccountSection from '../../features/settings/AccountSection';
import type { Nav } from '../app/App';
import { useSettings } from '../app/state';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { article, articles } from '../core/learn';
import { formatDuration, formatPace, METERS, parseDuration, raceDistances, timeFor, type Unit } from '../core/pace';
import { estimatedMax, maxHeartRate, zoneRanges } from '../core/zones';
import {
  clearEntries,
  loadPlan,
  readBackup,
  restore,
  saveSettings,
  savePlan,
  listEntries,
  putEntry,
} from '../data/store';

// ---------- Before you start ----------

export function SafetyPage({ nav, first }: { nav: Nav; first?: boolean }) {
  const settings = useSettings();
  const note = article('before-you-start')!;
  return (
    <div className="page">
      <BackLink label="Back" onBack={nav.back} />
      <h1 className="title">Before you start</h1>
      {note.sections.map((section) => (
        <section key={section.heading} className="card">
          <h2 className="card__title card__title--small">{section.heading}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <p className="hint">Askesis gives general training guidance, not medical advice.</p>
      {first && (
        <button
          type="button"
          className="button-main"
          onClick={() => {
            saveSettings({ ...settings, safetySeen: true });
            nav.go({ name: 'plan', first: true });
          }}
        >
          Continue
        </button>
      )}
    </div>
  );
}

// ---------- Heart rate zones ----------

export function ZonesPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const number = (text: string) => (text.trim() ? Number(text.replace(/[^\d]/g, '')) || undefined : undefined);
  const set = (key: 'age' | 'maxHr' | 'restingHr', text: string) => saveSettings({ ...settings, [key]: number(text) });
  const zones = zoneRanges(settings);
  const max = maxHeartRate(settings);
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Heart rate zones</h1>
      <p className="lead">Optional.</p>
      <div className="three-fields">
        <label className="field">
          <span className="label">Age</span>
          <input className="input" inputMode="numeric" value={settings.age ?? ''} onChange={(event) => set('age', event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Max HR</span>
          <input className="input" inputMode="numeric" placeholder={settings.age ? String(estimatedMax(settings.age)) : ''} value={settings.maxHr ?? ''} onChange={(event) => set('maxHr', event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Resting HR</span>
          <input className="input" inputMode="numeric" value={settings.restingHr ?? ''} onChange={(event) => set('restingHr', event.target.value)} />
        </label>
      </div>
      <p className="hint">
        {max
          ? settings.maxHr
            ? `Using your maximum of ${max} bpm${settings.restingHr ? ' and your resting heart rate (heart-rate reserve)' : ''}.`
            : `Estimated maximum ${max} bpm (208 − 0.7 × age).`
          : 'Add your age, or a maximum heart rate you know.'}
      </p>
      {zones.length > 0 && (
        <ol className="zones">
          {zones.map((zone) => (
            <li key={zone.zone} className={`zones__row zones__row--${zone.zone}`}>
              <span className="zones__name">
                Zone {zone.zone} · {zone.name}
              </span>
              <span className="zones__range">
                {zone.low}–{zone.high} bpm
              </span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="text-link" onClick={() => nav.go({ name: 'article', id: 'heart-rate' })}>
        About heart rate zones
      </button>
    </div>
  );
}

// ---------- Pace calculator ----------

export function PacePage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const [unit, setUnit] = useState<Unit>(settings.unit);
  const [mode, setMode] = useState<'pace' | 'finish'>('pace');
  const [distance, setDistance] = useState('5');
  const [time, setTime] = useState('30:00');
  const [pace, setPace] = useState('10:00');
  const meters = Number(distance.replace(',', '.')) * METERS[unit];
  const seconds = parseDuration(time);
  const paceSeconds = parseDuration(pace);
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Pace calculator</h1>
      <Segmented
        label="Work out"
        value={mode}
        options={[
          { id: 'pace', label: 'Pace from a time' },
          { id: 'finish', label: 'Time from a pace' },
        ]}
        onChange={setMode}
        small
      />
      <Segmented
        label="Unit"
        value={unit}
        options={[
          { id: 'mi', label: 'Miles' },
          { id: 'km', label: 'Kilometres' },
        ]}
        onChange={setUnit}
        small
      />
      {mode === 'pace' ? (
        <>
          <label className="field">
            <span className="label">Distance ({unit})</span>
            <input className="input" inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} />
          </label>
          <div className="chip-row">
            {raceDistances.map((race) => (
              <button key={race.name} type="button" className="chip" onClick={() => setDistance((race.meters / METERS[unit]).toFixed(2).replace(/\.?0+$/, ''))}>
                {race.name}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="label">Time (h:mm:ss or mm:ss)</span>
            <input className="input" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
          <p className="result">
            {seconds && meters > 0 ? formatPace(seconds / (meters / METERS[unit]), unit) : 'Add a distance and a time.'}
          </p>
        </>
      ) : (
        <>
          <label className="field">
            <span className="label">Pace per {unit} (mm:ss)</span>
            <input className="input" value={pace} onChange={(event) => setPace(event.target.value)} />
          </label>
          <ul className="finish-times">
            {raceDistances.map((race) => (
              <li key={race.name}>
                <span>{race.name}</span>
                <span>{paceSeconds ? formatDuration(timeFor(paceSeconds, race.meters, unit)) : '–'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Settings ----------

export function SettingsPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const flip = (key: 'voice' | 'bells' | 'keepAwake' | 'readSchedule' | 'afterOffers' | 'dailyLine') =>
    saveSettings({ ...settings, [key]: !settings[key] });
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Settings</h1>
      <section className="field">
        <h2 className="label">Distances in</h2>
        <Segmented
          label="Distances in"
          value={settings.unit}
          options={[
            { id: 'mi', label: 'Miles' },
            { id: 'km', label: 'Kilometres' },
          ]}
          onChange={(unit) => saveSettings({ ...settings, unit })}
        />
      </section>
      <div className="card switches">
        <Switch on={settings.voice} label="Spoken cues" detail="Your music keeps playing." onToggle={() => flip('voice')} />
        <Switch on={settings.bells} label="Bells" onToggle={() => flip('bells')} />
        <Switch on={settings.keepAwake} label="Keep the screen on" onToggle={() => flip('keepAwake')} />
        <Switch
          on={settings.readSchedule}
          label="Use my Proairetos schedule"
          detail="Marks days after a night of work."
          onToggle={() => flip('readSchedule')}
        />
      </div>
      <h2 className="label">What’s included</h2>
      <div className="card switches">
        <Switch on={settings.dailyLine} label="A line for the day" onToggle={() => flip('dailyLine')} />
        <Switch
          on={settings.afterOffers}
          label="After a workout"
          onToggle={() => flip('afterOffers')}
        />
      </div>
      <AccountSection />
    </div>
  );
}

// ---------- Your data ----------

export function DataPage({ nav }: { nav: Nav }) {
  const undo = useUndo();
  const [confirming, setConfirming] = useState(false);

  const wipe = async () => {
    const before = { entries: await listEntries(), plan: loadPlan() };
    await clearEntries();
    savePlan(undefined);
    setConfirming(false);
    undo('Everything deleted', () => {
      void Promise.all(before.entries.map(putEntry));
      savePlan(before.plan);
    });
  };

  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Your data</h1>
      <p className="lead">On this phone, and synced when signed in to Proairetos.</p>
      <FamilyBackup
        older={async (text: string) => {
          const old = readBackup(text);
          await restore(old);
          return `Brought in ${old.entries.length} workouts from an older Askesis backup.`;
        }}
      />
      <div className="card">
        <h2 className="card__title card__title--small">Delete everything</h2>
        <p className="muted">Removes your plan and every workout, here and, if you sync, on your other devices. Your Proairetos data is not touched.</p>
        {confirming ? (
          <div className="button-row">
            <button type="button" className="button-danger" onClick={() => void wipe()}>
              Delete everything
            </button>
            <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="button-quiet" onClick={() => setConfirming(true)}>
            Delete…
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- About and sources ----------

export function AboutPage({ nav }: { nav: Nav }) {
  const sources = [...new Set(articles.flatMap((item) => item.sources))].sort();
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">About Askesis</h1>
      <p>
        <em>Askesis</em> (ἄσκησις) is the Stoics’ word for training: exercise, practice, repeated until it becomes part of
        you. Epictetus used it for training the mind and the body alike. It sits beside Proairetos, their word for the
        faculty of choice.
      </p>
      <p>
        Like Proairetos, it records and never judges: no streaks, no scores, nothing to catch up on. The plans offer;
        you choose. Everything stays on your phone.
      </p>
      <h2 className="label">How your path is built</h2>
      <p>
        One path, from your first walk-run onward, toward an aim you set: a time, a distance, or simply to keep running. You
        join where you are, and the path goes only as far as your aim needs.
      </p>
      <ul className="tips">
        <li>Mostly easy: hard running at a fifth of each week or less.</li>
        <li>Gradual: weekly time grows under 10% between building weeks, and running days are added one at a time.</li>
        <li>An easier week every fourth week.</li>
        <li>Threshold runs, 4 × 4 intervals and long runs in their classic forms.</li>
        <li>A taper before a distance aim, and counting back to a date if you give one.</li>
        <li>Effort and time, never pace, so they work anywhere and for anyone.</li>
      </ul>
      <h2 className="label">Sources</h2>
      <ol className="sources-list">
        {sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ol>
      <p className="hint">General training guidance, not medical advice.</p>
      <a className="text-link" href="/privacy.html">
        Privacy
      </a>
    </div>
  );
}
