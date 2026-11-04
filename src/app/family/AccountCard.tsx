import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { hasPassphrase, linkAccountPasswordToEncryption, passkeysAvailable, requestCode, signInWithEmailPassword, unlockWithAccountPassword, syncNow, syncStatus, unlock } from '../sync/syncController';
import { storageName } from '../sync/ownStorage';
import { MakePasskeyNow, PasskeyOpen, PasskeySignIn, useOpeningPasskeys, usePasskeyAutofill } from './Passkey';
import { MIN_PASSPHRASE_LENGTH as MIN_ACCOUNT_PASSWORD_LENGTH } from '../../data/sync/keys';
import { ProviderButtons } from './ProviderButtons';
import { PasteFromProairetos } from './SignInPass';
import { Waiting } from '../../lamplight/Waiting';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.');

/**
 * The account is Proairetos's, shared by the family. Where the apps share
 * this browser's storage, signing in to one signs in all three. Where they
 * do not (each app added to an iPhone's Home Screen keeps its own), Askesis
 * and Soma sign in here with the same email and password, and the three
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
  const [password, setPassword] = useState('');
  const { busy, error, run } = useStep();
  const autofillError = usePasskeyAutofill(open);
  if (!open)
    return (
      <button type="button" className="button-quiet account__link" onClick={() => setOpen(true)}>
        Sign in with email
      </button>
    );
  return (
    <div className="card account__step">
      <form className="field" onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void run(() => signInWithEmailPassword(email, password));
      }}>
        <span className="label">Your Proairetos account</span>
        <input className="input" type="email" autoComplete="email" aria-label="Email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="input" type="password" autoComplete="current-password" aria-label="Password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="submit" className="button-main" disabled={!email.includes('@') || !password || busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <details className="account__other">
        <summary>Other ways to sign in</summary>
        <PasteFromProairetos className="button-quiet" />
        <ProviderButtons className="button-quiet" />
        <button type="button" className="button-quiet" onClick={() => void run(() => requestCode(email))} disabled={!email.includes('@') || busy}>Email me a sign-in code</button>
      </details>
      <button type="button" className="button-quiet" onClick={() => setOpen(false)}>Cancel</button>
      {autofillError && <p className="hint" role="alert">{autofillError}</p>}
      {error && <p className="hint" role="alert">{error}</p>}
    </div>
  );
}

function Unlock() {
  const account = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const [method, setMethod] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const { busy, error, run } = useStep();
  const opening = useOpeningPasskeys();
  const [typing, setTyping] = useState(false);
  const [withPasswordWrap, setWithPasswordWrap] = useState<boolean>();
  useEffect(() => void hasPassphrase().then(setWithPasswordWrap), []);
  if (opening === undefined || withPasswordWrap === undefined) return null;
  if (opening.length > 0 && !typing) {
    return (
      <>
        <PasskeyOpen rows={opening} className="button-main account__link" />
        <button type="button" className="button-quiet account__link" onClick={() => setTyping(true)}>
          Use account password
        </button>
      </>
    );
  }
  return (
    <>
    <div className="card account__step field">
    <form
      className="field"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void run(async () => {
          if (method === 'password') {
            if (!account.email) throw new Error('Sign in again before opening your data.');
            await signInWithEmailPassword(account.email, password);
            await unlockWithAccountPassword();
          } else {
            await unlock(recoveryKey, 'recovery', passkeysAvailable() && !opening.length);
            if (password.length >= MIN_ACCOUNT_PASSWORD_LENGTH && account.email) {
              await signInWithEmailPassword(account.email, password);
              await linkAccountPasswordToEncryption(password, recoveryKey, 'recovery');
            }
          }
        });
      }}
    >
      <span className="label">Account password</span>
      <input
        className="input"
        type="password"
        autoComplete="current-password"
        aria-label="Account password"
        placeholder="Account password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {method === 'recovery' && (
        <>
          <span className="label">Recovery key</span>
          <input className="input" type="text" autoComplete="off" aria-label="Recovery key" placeholder="Recovery key" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} />
          {!withPasswordWrap && <p className="hint">Enter your account password above to connect it while this recovery key opens your data.</p>}
        </>
      )}
      <button type="submit" className="button-main" disabled={busy || (method === 'password' ? !password : !recoveryKey)}>
        {busy ? <Waiting>Opening…</Waiting> : method === 'password' ? 'Unlock with account password' : 'Unlock with recovery key'}
      </button>
      <button type="button" className="button-quiet" onClick={() => { setMethod(method === 'password' ? 'recovery' : 'password'); setRecoveryKey(''); }}>
        {method === 'password' ? 'Use recovery key' : 'Use account password'}
      </button>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </form>
    </div>
    {!opening.length && <PasteFromProairetos className="button-quiet account__link" />}
    </>
  );
}
