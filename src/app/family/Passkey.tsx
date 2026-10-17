import { useEffect, useState } from 'react';
import { PasskeyCancelled, passkeyAutofillHere } from '../../data/sync/passkeys';
import type { PasskeyRow } from '../../data/sync/supabase';
import {
  addPasskey,
  forgetPreparedPasskey,
  letPasskeyOpen,
  listPasskeys,
  onPasskeysChanged,
  openDataWithPasskey,
  openingPasskeys,
  passkeyChallenge,
  passkeyWaiting,
  passkeysAvailable,
  passkeyAutofill,
  signInWithPasskey,
  stopPasskeyAutofill,
} from '../sync/syncController';
import { Waiting } from '../../lamplight/Waiting';

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

/** The account's passkeys that open the data on this site; undefined while asking, [] when none or not here. */
export function useOpeningPasskeys(): PasskeyRow[] | undefined {
  const [rows, setRows] = useState<PasskeyRow[] | undefined>(passkeysAvailable() ? undefined : []);
  useEffect(() => {
    if (!passkeysAvailable()) return;
    const read = () => void openingPasskeys().then(setRows);
    read();
    return onPasskeysChanged(read);
  }, []);
  return rows;
}

/** Signed in, data not open here: open it with a passkey, when the account has one that can. */
export function PasskeyOpen({ className = 'button-main', errorClass = 'hint', rows = [] }: Look & { rows?: readonly PasskeyRow[] }) {
  const { busy, error, run } = usePasskeyStep();
  if (!rows.length) return null;
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => void run(() => openDataWithPasskey(rows))}>
        {busy ? <Waiting>Opening…</Waiting> : 'Open with a passkey'}
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
  // A passkey just made that gives its secret only when used: the tap that asks for it.
  const [finish, setFinish] = useState<string>();
  const { busy, error, run } = usePasskeyStep();
  useEffect(() => {
    if (waiting) void listPasskeys().then((rows) => setExclude(rows.map((each) => each.id)), () => undefined);
  }, [waiting]);
  if (!waiting && !note && !finish) return null;
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
                const added = await addPasskey(exclude);
                setWaiting(false);
                onDone?.();
                if (added.finish) setFinish(added.finish);
                else setNote(added.opens ? 'Passkey added.' : 'Passkey added. It signs in; on this device your passphrase still opens your data.');
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
      {finish && (
        <>
          <p className={noteClass}>One more Face ID lets this passkey open your data too.</p>
          <button
            type="button"
            className={className}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const opens = await letPasskeyOpen(finish);
                setFinish(undefined);
                onDone?.();
                setNote(opens ? 'Passkey added. It opens your data in every app.' : 'Passkey added. It signs in; on this device your passphrase still opens your data.');
              })
            }
          >
            {busy ? 'Asking…' : 'Continue'}
          </button>
          <button
            type="button"
            className={quietClass}
            onClick={() => {
              forgetPreparedPasskey();
              setFinish(undefined);
              setNote('Passkey added. It signs in; your passphrase still opens your data.');
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

/**
 * While a sign-in email field is on screen: this site's passkeys are offered in the keyboard's suggestions
 * (the field needs autoComplete "email webauthn"). Picking one signs in. Re-armed before its challenge runs out.
 * Returns an error to show, if signing in that way did not work.
 */
export function usePasskeyAutofill(active: boolean): string {
  const [error, setError] = useState('');
  useEffect(() => {
    if (!active || !passkeysAvailable()) return;
    let stopped = false;
    const arm = () =>
      void passkeyAutofillHere().then((here) => {
        if (!here || stopped) return;
        passkeyAutofill().catch((cause: unknown) => {
          if (!stopped && !(cause instanceof PasskeyCancelled)) setError(message(cause));
        });
      });
    arm();
    const timer = window.setInterval(arm, CHALLENGE_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      stopPasskeyAutofill();
    };
  }, [active]);
  return error;
}
