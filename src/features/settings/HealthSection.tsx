import { useEffect, useRef, useState } from 'react';
import { useSyncStatus } from './AccountSection';
import { useAddedApps } from '../../app/family/added';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { broughtInText } from '../../core/health/fromHealth';
import {
  HEALTH_PARTS,
  bringInHealthFile,
  healthAddress,
  healthChoices,
  healthKey,
  openHealthInbox,
  saveHealthChoices,
  turnOffHealth,
  turnOnHealth,
  type BroughtIn,
  type HealthChoices,
} from '../../app/health/health';

const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'That didn’t work. Try again.');

function Copy({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="inbox-copy">
      <span className="sheet__label">{label}</span>
      <code className="inbox-copy__value">{value}</code>
      <button type="button" className="chip" onClick={() => void navigator.clipboard?.writeText(value).then(() => setCopied(true))}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * Settings > Apple Health: Health Auto Export on the iPhone sends Health data to the person's own address, and their
 * apps bring in what is new (workouts to Askesis, sleep to Diaita, water to Hydros, readings to Therapeia).
 */
export default function HealthSection({ onOpenAccount, onOpenStore }: { onOpenAccount: () => void; onOpenStore: () => void }) {
  const status = useSyncStatus();
  const added = useAddedApps() as string[];
  const { offerUndo } = useOverlays();
  const [choices, setChoices] = useState<HealthChoices | undefined>(healthChoices);
  const [token, setToken] = useState<string>();
  const [looked, setLooked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!choices || status.phase !== 'ready') return;
    let live = true;
    void healthKey().then((kept) => {
      if (!live) return;
      setToken(kept?.token);
      setLooked(true);
    });
    return () => {
      live = false;
    };
  }, [choices, status.phase]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  const told = (result: BroughtIn | undefined) => {
    const text = result ? broughtInText(result.counts) : '';
    if (text && result) offerUndo(text, () => result.undo());
    else setNote('Nothing new.');
  };

  const parts = HEALTH_PARTS.filter((part) => added.includes(part.app));

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void run(async () => told(await bringInHealthFile(file)));
      }}
    />
  );

  if (!parts.length) {
    return (
      <section className="settings-card">
        <p className="section-description">Apple Health fills in Askesis, Diaita, Hydros and Therapeia. Add one of them first.</p>
        <button type="button" className="button-accent account-wide" onClick={onOpenStore}>
          Store
        </button>
      </section>
    );
  }

  if (status.phase !== 'ready') {
    return (
      <section className="settings-card">
        <p className="section-description">To have Apple Health fill in your apps by itself, sign in and open your data first.</p>
        <button type="button" className="button-accent account-wide" onClick={onOpenAccount}>
          Account and sync
        </button>
        <button type="button" className="text-link" disabled={busy} onClick={() => fileRef.current?.click()}>
          Bring in a file instead
        </button>
        {fileInput}
        {error && <p className="form-error" role="alert">{error}</p>}
        {note && <p className="sheet__hint">{note}</p>}
      </section>
    );
  }

  if (!choices) {
    return (
      <section className="settings-card">
        <p className="section-description">
          Your workouts, sleep, water and readings from Apple Health can fill in your apps by themselves. This uses Health Auto Export, an iPhone app that sends your Health data to a private address. What arrives is locked so only your apps can open it.
        </p>
        <button
          type="button"
          className="button-accent account-wide"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const kept = await turnOnHealth();
              setToken(kept.token);
              setChoices(healthChoices());
            })
          }
        >
          {busy ? 'Setting up…' : 'Turn on'}
        </button>
        <button type="button" className="text-link" disabled={busy} onClick={() => fileRef.current?.click()}>
          Bring in a file instead
        </button>
        {fileInput}
        {error && <p className="form-error" role="alert">{error}</p>}
        {note && <p className="sheet__hint">{note}</p>}
      </section>
    );
  }

  const change = (id: keyof HealthChoices) => {
    const next = { ...choices, [id]: !choices[id] };
    saveHealthChoices(next);
    setChoices(next);
  };

  return (
    <div className="settings-sections">
      <section className="settings-group" aria-label="Your address">
        <h2 className="settings-group__label">Your address</h2>
        <div className="settings-card">
          {token ? (
            <Copy label="Address" value={healthAddress(token)} />
          ) : looked ? (
            <>
              <p className="section-description">Your account has no address yet.</p>
              <button
                type="button"
                className="button-accent account-wide"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const kept = await turnOnHealth();
                    setToken(kept.token);
                  })
                }
              >
                {busy ? 'Making it…' : 'Make the address'}
              </button>
            </>
          ) : (
            <p className="section-description">Opening…</p>
          )}
          <p className="sheet__hint">Anyone with this address can send data to your apps, but they can’t read anything. If it gets out, make a new one.</p>
        </div>
      </section>

      <section className="settings-group" aria-label="Set up Health Auto Export">
        <h2 className="settings-group__label">Set up Health Auto Export</h2>
        <div className="settings-card">
          <ol className="inbox-steps">
            <li>Get <strong>Health Auto Export</strong> from the App Store and let it read your Health data. Sending to an address needs its paid version.</li>
            <li>Tap <strong>Automations</strong>, then the plus button, and choose <strong>REST API</strong>.</li>
            <li>Paste your address into <strong>URL</strong>.</li>
            <li>Set the format to <strong>JSON</strong>.</li>
            <li>
              For the data, choose <strong>Health Metrics</strong> and pick Sleep Analysis, Dietary Water, Weight & Body Mass, Blood Pressure, Blood Glucose, Body Temperature, Resting Heart Rate and Blood Oxygen Saturation. Leave out any you don’t want.
            </li>
            <li>Set how often it sends. Once an hour is plenty. If it asks how much to send, choose since the last sync.</li>
            <li>Turn the automation on and tap <strong>Manual Export</strong> once to try it.</li>
            <li>For runs and walks, make a second automation the same way and choose <strong>Workouts</strong> as the data.</li>
          </ol>
          <p className="sheet__hint">When you next open one of your apps, anything new comes in and a note at the bottom says what. Anything you logged yourself stays as it is.</p>
        </div>
      </section>

      <section className="settings-group" aria-label="What goes where">
        <h2 className="settings-group__label">What goes where</h2>
        <div className="settings-card settings-card--rows">
          {parts.map((part) => (
            <button key={part.id} type="button" className="toggle-row" role="switch" aria-checked={choices[part.id]} aria-pressed={choices[part.id]} onClick={() => change(part.id)}>
              <span className={`toggle-switch${choices[part.id] ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
              <span className="toggle-row__text">
                {part.title}
                <span className="toggle-row__hint">{part.what}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-group" aria-label="Apple Health">
        <div className="settings-card">
          <div className="button-row">
            <button type="button" className="button-quiet" disabled={busy} onClick={() => void run(async () => told(await openHealthInbox()))}>
              Check now
            </button>
            <button type="button" className="button-quiet" disabled={busy} onClick={() => fileRef.current?.click()}>
              Bring in a file
            </button>
          </div>
          {fileInput}
          {note && <p className="sheet__hint">{note}</p>}
          <button
            type="button"
            className="chip account-wide"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const kept = await turnOnHealth();
                setToken(kept.token);
              })
            }
          >
            Make a new address
          </button>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await turnOffHealth();
                setChoices(undefined);
                setToken(undefined);
              })
            }
          >
            Turn off
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  );
}
