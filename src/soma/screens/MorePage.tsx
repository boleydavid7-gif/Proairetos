import { useState, type ReactNode } from 'react';
import type { Nav, Route } from '../app/App';
import { BoxIcon, GearIcon, InfoIcon, JarIcon } from '../app/icons';
import { scene } from '../app/scenes';
import { useSettings } from '../app/state';
import { BackLink, Brand, Switch, useUndo } from '../app/ui';
import { sources } from '../core/tryIt';
import { backup, deleteEverything, restore, saveSettings, type Backup } from '../data/store';

export default function MorePage({ nav }: { nav: Nav }) {
  const rows: { icon: ReactNode; title: string; detail: string; route: Route }[] = [
    { icon: <JarIcon />, title: 'Usually have', detail: 'Left off the list when adding a recipe', route: { name: 'usually' } },
    { icon: <GearIcon />, title: 'Settings', detail: 'Daily line, ways to try it', route: { name: 'settings' } },
    { icon: <BoxIcon />, title: 'Your data', detail: 'Back up, restore, delete', route: { name: 'data' } },
    { icon: <InfoIcon />, title: 'About and sources', detail: 'The name, the guidance', route: { name: 'about' } },
  ];
  return (
    <div className="page more">
      <Brand />
      <ul className="rows">
        {rows.map((row) => (
          <li key={row.title}>
            <button type="button" className="row" onClick={() => nav.go(row.route)}>
              <span className="row__icon">{row.icon}</span>
              <span className="row__text">
                <span>{row.title}</span>
                <span className="row__detail">{row.detail}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <a className="row" href="/">
            <span className="row__icon">
              <img className="row__app" src="/icons/icon.svg" alt="" width={26} height={26} />
            </span>
            <span className="row__text">
              <span>Proairetos</span>
              <span className="row__detail">Your days, your values, your reflections</span>
            </span>
          </a>
        </li>
        <li>
          <a className="row" href="/askesis/">
            <span className="row__icon">
              <img className="row__app" src="/askesis/icon.svg" alt="" width={26} height={26} />
            </span>
            <span className="row__text">
              <span>Askesis</span>
              <span className="row__detail">Running, from your first walk-run</span>
            </span>
          </a>
        </li>
      </ul>
      <figure className="more__foot">
        <img src={scene('olive-wall')} alt="" />
        <figcaption>
          <blockquote>“Nature asks for little; it is opinion that asks for more.”</blockquote>
          <span>After Seneca</span>
        </figcaption>
      </figure>
    </div>
  );
}

export function UsuallyPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const undo = useUndo();
  const [adding, setAdding] = useState('');
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Usually have</h1>
      <form
        className="add-row"
        onSubmit={(event) => {
          event.preventDefault();
          const word = adding.trim().toLowerCase();
          if (!word || settings.usuallyHave.includes(word)) return;
          saveSettings({ ...settings, usuallyHave: [...settings.usuallyHave, word] });
          setAdding('');
        }}
      >
        <input className="input" aria-label="Something you usually have" placeholder="flour" value={adding} onChange={(event) => setAdding(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!adding.trim()}>
          Add
        </button>
      </form>
      <ul className="song-list">
        {settings.usuallyHave.map((word) => (
          <li key={word} className="song-list__item">
            <span>{word}</span>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                saveSettings({ ...settings, usuallyHave: settings.usuallyHave.filter((each) => each !== word) });
                undo(`${word} removed`, () => saveSettings(settings));
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Settings</h1>
      <div className="card switches">
        <Switch on={settings.dailyLine} label="A line for the day" onToggle={() => saveSettings({ ...settings, dailyLine: !settings.dailyLine })} />
        <Switch on={settings.waysToTry} label="Ways to try it" onToggle={() => saveSettings({ ...settings, waysToTry: !settings.waysToTry })} />
      </div>
      <p className="hint">Theme and text size follow Proairetos (Settings, Appearance).</p>
    </div>
  );
}

export function DataPage({ nav }: { nav: Nav }) {
  const undo = useUndo();
  const [status, setStatus] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Your data</h1>
      <p className="lead">On this phone only.</p>
      <div className="card">
        <button
          type="button"
          className="button-quiet"
          onClick={async () => {
            const file = await backup();
            const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `soma-${file.savedAt.slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(link.href);
          }}
        >
          Save a backup file
        </button>
        <label className="button-quiet">
          Restore from a file
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                const count = await restore(JSON.parse(await file.text()) as Backup);
                setStatus(count === 1 ? 'One recipe brought in.' : `${count} recipes brought in.`);
              } catch (cause) {
                setStatus(cause instanceof Error ? cause.message : 'That file could not be read.');
              }
            }}
          />
        </label>
      </div>
      <div className="card">
        {confirming ? (
          <>
            <p>Remove every recipe and the grocery list from this phone?</p>
            <div className="button-row">
              <button
                type="button"
                className="button-quiet"
                onClick={async () => {
                  const putBack = await deleteEverything();
                  setConfirming(false);
                  undo('Everything removed', () => void putBack());
                }}
              >
                Remove everything
              </button>
              <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="text-link" onClick={() => setConfirming(true)}>
            Remove everything
          </button>
        )}
      </div>
      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

export function AboutPage({ nav }: { nav: Nav }) {
  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">About SOMA</h1>
      <p>
        Sōma is the Greek word for the body. SOMA keeps your recipes and your grocery list, and offers small ways to cook a little more
        simply when you want them. It never counts calories, never scores food, and never calls any food good or bad.
      </p>
      <h2 className="label">Ways to try it draw on</h2>
      <ul className="tips">
        {Object.values(sources).map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
      <h2 className="label">Ideas</h2>
      <p className="muted">From TheMealDB (themealdb.com), a free and open collection of recipes.</p>
      <h2 className="label">Lines for the day</h2>
      <p className="muted">
        Musonius Rufus, Lectures 18A and 18B (On Food); Epictetus, Enchiridion; Seneca, Letters. Lines marked “after” keep close to the
        sense of the original.
      </p>
      <p className="hint">General guidance on cooking, not medical or dietary advice.</p>
    </div>
  );
}
