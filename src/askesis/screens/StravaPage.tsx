import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Nav } from '../app/App';
import { BackLink, useUndo } from '../app/ui';
import {
  bringInFromStrava,
  connectStrava,
  disconnectStrava,
  finishStravaConnect,
  onStravaChanged,
  stravaHere,
  stravaLink,
  takeBack,
} from '../app/strava';
import type { LogEntry } from '../core/log';
import { Waiting } from '../../lamplight/Waiting';

const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'That did not work. Try again.');
const read = () => JSON.stringify(stravaLink() ?? null);

function useLink() {
  const raw = useSyncExternalStore(onStravaChanged, read);
  return JSON.parse(raw) as ReturnType<typeof stravaLink> | null;
}

const said = (added: readonly LogEntry[]) =>
  added.length === 1 ? `1 workout from Strava${added[0].workoutTitle ? `, as ${added[0].workoutTitle.toLowerCase()}` : ''}` : `${added.length} workouts from Strava`;

/** More > Strava: connect, bring in now, disconnect. */
export default function StravaPage({ nav }: { nav: Nav }) {
  const link = useLink();
  const offer = useUndo();
  const [here, setHere] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

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

  const bringIn = () =>
    run(async () => {
      const added = await bringInFromStrava();
      if (added.length) offer(said(added), () => void takeBack(added));
      else setNote('Nothing new.');
    });

  useEffect(() => {
    void stravaHere().then((id) => setHere(Boolean(id)));
    void run(async () => {
      const problem = await finishStravaConnect();
      if (problem) setError(problem);
      else if (stravaLink()?.refresh) {
        const added = await bringInFromStrava();
        if (added.length) offer(said(added), () => void takeBack(added));
      }
    });
  }, []);

  const connected = Boolean(link?.refresh);
  const last = link?.lastAt ? new Date(link.lastAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : undefined;

  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Strava</h1>
      {here === false && !connected ? (
        <p className="muted">Strava is not set up on this site yet.</p>
      ) : connected ? (
        <section className="card stack">
          <p>
            Connected{link?.name ? ` as ${link.name}` : ''}
            {last && <span className="muted"> · last looked {last}</span>}
          </p>
          <p className="muted">Runs, walks and rides arrive in Log when Askesis opens. A run on a day with a session counts as that session.</p>
          <button type="button" className="button-main" disabled={busy} onClick={() => void bringIn()}>
            {busy ? <Waiting>Looking…</Waiting> : 'Bring in now'}
          </button>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const kept = stravaLink();
              disconnectStrava();
              if (kept) offer('Strava disconnected', () => localStorage.setItem('askesis:strava', JSON.stringify(kept)));
            }}
          >
            Disconnect
          </button>
        </section>
      ) : (
        <section className="card stack">
          <p className="muted">Workouts from your watch arrive on their own: Garmin, Apple Watch, COROS, Polar and Wear OS all send to Strava.</p>
          <button type="button" className="button-main strava-connect" disabled={busy || here !== true} onClick={() => void run(connectStrava)}>
            Connect with Strava
          </button>
        </section>
      )}
      {note && <p className="muted" role="status">{note}</p>}
      {error && <p className="hint" role="alert">{error}</p>}
      <p className="muted strava-powered">Powered by Strava</p>
    </div>
  );
}

/** On opening Askesis: what is new on Strava, at most every 15 minutes, with one undo. Renders nothing. */
export function StravaOnOpen() {
  const offer = useUndo();
  useEffect(() => {
    if (!stravaLink()?.refresh) return;
    void bringInFromStrava(true)
      .then((added) => added.length && offer(said(added), () => void takeBack(added)))
      .catch(() => undefined);
  }, []);
  return null;
}
