import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { changePassphrase, confirmCode, hasPassphrase, passkeysAvailable, requestCode, syncNow, syncStatus, unlock } from '../sync/syncController';
import { storageName } from '../sync/ownStorage';
import { MakePasskeyNow, PasskeyOpen, PasskeySignIn, useOpeningPasskeys, usePasskeyAutofill } from './Passkey';
import { MIN_PASSPHRASE_LENGTH } from '../../data/sync/keys';
import { ProviderButtons } from './ProviderButtons';
import { PasteFromProairetos } from './SignInPass';
import { Waiting } from '../../lamplight/Waiting';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.');

/**
 * The account is Proairetos's, shared by the family. Where the apps share
 * this browser's storage, signing in to one signs in all three. Where they
 * do not (each app added to an iPhone's Home Screen keeps its own), Askesis
 * and Soma sign in here with the same email and passphrase, and the three
 * meet through sync. Setting sync up the first time stays in Proairetos,
 * where the recovery key is shown.
 */
export default function AccountCard({ app, what, waiting }: { app: string; what: string; waiting: string }) {
  const account = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const synced = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : undefined;
  const target = storageName(account.target ?? 'proairetos');
  const [title, detail] =
    account.phase === 'ready'
      ? [
          account.email ?? 'Signed in',
          account.held ? `${waiting} wait on this device until the server is updated.` : `${what} sync with ${target}${synced ? `. Last ${synced}` : ''}.`,
        ]
      : account.phase === 'signed-out'
        ? ['Not signed in', `The same account as Proairetos.`]
        : account.phase === 'locked'
          ? [account.email ?? 'Signed in', 'Open your data here.']
          : account.phase === 'needs-setup'
            ? [account.email ?? 'Signed in', `Set up sync in Proairetos, then it covers ${app} too.`]
            : ['On this device', 'Everything stays on this device.'];
  return (
    <section className="account" aria-label="Account">
      <div className="rows">
        <div className="row">
          <span className="row__icon">
            <img className="row__app" src="/icons/icon.svg" alt="" width={26} height={26} />
          </span>
          <span className="row__text">
            <span>{title}</span>
            <span className="row__detail">{detail}</span>
          </span>
          {account.phase === 'ready' && (
            <button type="button" className="text-link" disabled={account.syncing} onClick={() => void syncNow()}>
              {account.syncing ? 'Syncing…' : 'Sync now'}
            </button>
          )}
        </div>
      </div>
      {account.phase === 'signed-out' && <PasskeySignIn className="button-main account__link" />}

      {account.phase === 'signed-out' && <SignIn />}
      {account.phase === 'locked' && <Unlock />}
      {account.phase === 'ready' && <MakePasskeyNow className="button-main account__link" quietClass="button-quiet account__link" />}
      {account.phase === 'needs-setup' && (
        <a className="button-quiet account__link" href="/?open=account">
          Open Proairetos
        </a>
      )}
      {account.error && account.phase === 'ready' && (
        <p className="hint" role="status">
          {account.error}
        </p>
      )}
    </section>
  );
}

function useStep() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function SignIn() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useStep();
  const autofillError = usePasskeyAutofill(open && !sent);
  if (!open)
    return (
      <button type="button" className="button-quiet account__link" onClick={() => setOpen(true)}>
        Sign in with email
      </button>
    );
  return (
    <div className="card account__step">
      {!sent ? (
        <form
          className="field"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void run(async () => {
              await requestCode(email);
              setSent(true);
            });
          }}
        >
          <span className="label">Your Proairetos email</span>
          <input className="input" type="email" autoComplete="email webauthn" aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" className="button-main" disabled={!email.includes('@') || busy}>
            {busy ? 'Sending…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form
          className="field"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void run(() => confirmCode(email, code));
          }}
        >
          <span className="label">Code or link from the email to {email}</span>
          <input
            className="input"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Code or link from the email"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" className="button-main" disabled={code.trim().length < 6 || busy}>
            Sign in
          </button>
          <button type="button" className="button-quiet" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}
      {!sent && (
        <details className="account__other">
          <summary>Other ways to sign in</summary>
          <PasteFromProairetos className="button-quiet" />
          <ProviderButtons className="button-quiet" />
        </details>
      )}
      <button type="button" className="button-quiet" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {autofillError && (
        <p className="hint" role="alert">
          {autofillError}
        </p>
      )}
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Unlock() {
  const [secret, setSecret] = useState('');
  const [method, setMethod] = useState<'passphrase' | 'recovery'>('passphrase');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const { busy, error, run } = useStep();
  const [withPassphrase, setWithPassphrase] = useState<boolean>();
  useEffect(() => void hasPassphrase().then(setWithPassphrase), []);
  // A passkey that opens the data is the way in here too; the passphrase and a pass are one link away.
  const opening = useOpeningPasskeys();
  const [typing, setTyping] = useState(false);
  if (opening === undefined || withPassphrase === undefined) return null;
  const recovery = method === 'recovery' || !withPassphrase;
  // A forgotten passphrase is replaced; an account without one simply opens with the recovery key.
  const choosing = recovery && withPassphrase;
  const ready = Boolean(secret) && (!choosing || (next.length >= MIN_PASSPHRASE_LENGTH && next === again));
  if (opening.length > 0 && !typing) {
    return (
      <>
        <PasskeyOpen rows={opening} className="button-main account__link" />
        <button type="button" className="button-quiet account__link" onClick={() => setTyping(true)}>
          {withPassphrase ? 'Use my passphrase' : 'Use my recovery key'}
        </button>
      </>
    );
  }
  return (
    <>
    <form
      className="card account__step field"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void run(async () => {
          if (choosing) await changePassphrase(secret, 'recovery', next);
          // Without a passkey that opens the data, the next screen offers to make one.
          await unlock(secret, recovery ? 'recovery' : 'passphrase', passkeysAvailable() && !opening.length);
        });
      }}
    >
      <span className="label">{recovery ? 'Your recovery key' : 'Your passphrase'}</span>
      <input
        className="input"
        type={recovery ? 'text' : 'password'}
        autoComplete={recovery ? 'off' : 'current-password'}
        aria-label={recovery ? 'Recovery key' : 'Passphrase'}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
      />
      {choosing && (
        <>
          <span className="label">New passphrase</span>
          <input className="input" type="password" autoComplete="new-password" aria-label="New passphrase" value={next} onChange={(event) => setNext(event.target.value)} />
          <input className="input" type="password" autoComplete="new-password" aria-label="New passphrase again" placeholder="Again" value={again} onChange={(event) => setAgain(event.target.value)} />
          {next && next.length < MIN_PASSPHRASE_LENGTH && <p className="hint">At least {MIN_PASSPHRASE_LENGTH} characters.</p>}
          {next && again && next !== again && <p className="hint">The passphrases don’t match.</p>}
        </>
      )}
      <button type="submit" className="button-main" disabled={!ready || busy}>
        {busy ? <Waiting>Opening…</Waiting> : 'Open'}
      </button>
      {withPassphrase && (
        <button type="button" className="button-quiet" onClick={() => (setMethod(method === 'recovery' ? 'passphrase' : 'recovery'), setSecret(''), setNext(''), setAgain(''))}>
          {method === 'recovery' ? 'Use my passphrase instead' : 'Forgot your passphrase?'}
        </button>
      )}
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </form>
    {!opening.length && <PasteFromProairetos className="button-quiet account__link" />}
    </>
  );
}
