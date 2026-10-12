import { useEffect, useState } from 'react';
import { PasskeyCancelled } from '../../data/sync/passkeys';
import type { PasskeyRow } from '../../data/sync/supabase';
import {
  addPasskey,
  forgetPreparedPasskey,
  listPasskeys,
  openDataWithPasskey,
  openingPasskeys,
  passkeyChallenge,
  passkeyWaiting,
  passkeysAvailable,
  signInWithPasskey,
} from '../sync/syncController';

/*
 * Passkeys on the sign-in and unlock steps of every app: one Face ID, fingerprint or PIN signs in and opens the
 * data, since a passkey belongs to the site and so to every app of the family. Safari lets a passkey be used only
 * straight after a tap, so whatever the server is asked comes before it.
 */

const message = (error: unknown) => (error instanceof Error ? error.message : 'That did not work. Try again.');
const CHALLENGE_MS = 90_000;

export function usePasskeyStep() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      if (!(cause instanceof PasskeyCancelled)) setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

type Look = { className?: string; errorClass?: string };

/** Signed out: sign in with a passkey. */
export function PasskeySignIn({ className = 'button-main', errorClass = 'hint' }: Look) {
  const [challenge, setChallenge] = useState<{ value: string; at: number }>();
  const { busy, error, run } = usePasskeyStep();
  const available = passkeysAvailable();

  useEffect(() => {
    if (!available) return;
    let stop = false;
    const fetchOne = () =>
      void passkeyChallenge()
        .then((value) => !stop && setChallenge({ value, at: Date.now() }))
        .catch(() => undefined);
    fetchOne();
    const timer = window.setInterval(fetchOne, CHALLENGE_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [available]);

  if (!available) return null;
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const fresh = challenge && Date.now() - challenge.at < CHALLENGE_MS + 20_000 ? challenge.value : await passkeyChallenge();
            setChallenge(undefined);
            await signInWithPasskey(fresh);
          })
        }
      >
        {busy ? 'Signing in…' : 'Sign in with a passkey'}
      </button>
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** Signed in, data not open here: open it with a passkey, when the account has one that can. */
export function PasskeyOpen({ className = 'button-main', errorClass = 'hint' }: Look) {
  const [rows, setRows] = useState<PasskeyRow[]>([]);
  const { busy, error, run } = usePasskeyStep();
  useEffect(() => {
    if (passkeysAvailable()) void openingPasskeys().then(setRows);
  }, []);
  if (!rows.length) return null;
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => void run(() => openDataWithPasskey(rows))}>
        {busy ? 'Opening…' : 'Open with a passkey'}
      </button>
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** A choice on the passphrase step: after it opens the data, one more tap makes a passkey. */
export function AddPasskeyChoice({ checked, onChange, className = 'toggle-check' }: { checked: boolean; onChange: (next: boolean) => void; className?: string }) {
  if (!passkeysAvailable()) return null;
  return (
    <label className={className}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Add a passkey for next time</span>
    </label>
  );
}

/** Right after the passphrase opened the data with "Add a passkey" chosen: the tap that makes it. */
export function MakePasskeyNow({ className = 'button-main', quietClass = 'button-quiet', errorClass = 'hint', noteClass = 'hint', onDone }: Look & { quietClass?: string; noteClass?: string; onDone?: () => void }) {
  const [waiting, setWaiting] = useState(passkeyWaiting());
  const [note, setNote] = useState('');
  const [exclude, setExclude] = useState<string[]>([]);
  const { busy, error, run } = usePasskeyStep();
  useEffect(() => {
    if (waiting) void listPasskeys().then((rows) => setExclude(rows.map((each) => each.id)), () => undefined);
  }, [waiting]);
  if (!waiting && !note) return null;
  return (
    <div className="passkey-now">
      {waiting && (
        <>
          <button
            type="button"
            className={className}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const opens = await addPasskey(exclude);
                setWaiting(false);
                onDone?.();
                setNote(opens ? 'Passkey added.' : 'Passkey added. It signs in; on this device your passphrase still opens your data.');
              })
            }
          >
            {busy ? 'Adding…' : 'Add the passkey'}
          </button>
          <button
            type="button"
            className={quietClass}
            onClick={() => {
              forgetPreparedPasskey();
              setWaiting(false);
            }}
          >
            Not now
          </button>
        </>
      )}
      {note && (
        <p className={noteClass} role="status">
          {note}
        </p>
      )}
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
