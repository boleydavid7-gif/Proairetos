import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { confirmCode, requestCode, syncNow, syncStatus, unlock } from '../sync/syncController';
import { ProviderButtons } from './ProviderButtons';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.');

/**
 * The account is Proairetos's, shared by the family. Where the apps share
 * this browser's storage, signing in to one signs in all three. Where they
 * do not (each app added to an iPhone's Home Screen keeps its own), Askesis
 * and SOMA sign in here with the same email and passphrase, and the three
 * meet through sync. Setting sync up the first time stays in Proairetos,
 * where the recovery key is shown.
 */
export default function AccountCard({ app, what, waiting }: { app: string; what: string; waiting: string }) {
  const account = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const synced = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : undefined;
  const [title, detail] =
    account.phase === 'ready'
      ? [
          account.email ?? 'Signed in',
          account.held ? `${waiting} wait on this phone until the server is updated.` : `${what} sync with Proairetos${synced ? `. Last ${synced}` : ''}.`,
        ]
      : account.phase === 'signed-out'
        ? ['Not signed in', `The same account as Proairetos.`]
        : account.phase === 'locked'
          ? [account.email ?? 'Signed in', 'Your passphrase opens your data here.']
          : account.phase === 'needs-setup'
            ? [account.email ?? 'Signed in', `Set up sync in Proairetos, then it covers ${app} too.`]
            : ['On this phone', 'Everything stays on this phone.'];
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
      {account.phase === 'signed-out' && <SignIn />}
      {account.phase === 'locked' && <Unlock />}
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
  if (!open)
    return (
      <button type="button" className="button-quiet account__link" onClick={() => setOpen(true)}>
        Sign in
      </button>
    );
  return (
    <div className="card account__step">
      {!sent && <ProviderButtons className="button-quiet" />}
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
          <input className="input" type="email" autoComplete="email" aria-label="Email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" className="button-main" disabled={!email.includes('@') || busy}>
            Send code
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
          <p className="hint">If it is a link, long-press it, copy, and paste it here.</p>
          <button type="submit" className="button-main" disabled={code.trim().length < 6 || busy}>
            Sign in
          </button>
          <button type="button" className="button-quiet" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}
      <button type="button" className="button-quiet" onClick={() => setOpen(false)}>
        Cancel
      </button>
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
  const { busy, error, run } = useStep();
  return (
    <form
      className="card account__step field"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void run(() => unlock(secret, method));
      }}
    >
      <span className="label">{method === 'passphrase' ? 'Your sync passphrase' : 'Your recovery key'}</span>
      <input
        className="input"
        type={method === 'passphrase' ? 'password' : 'text'}
        autoComplete={method === 'passphrase' ? 'current-password' : 'off'}
        aria-label={method === 'passphrase' ? 'Passphrase' : 'Recovery key'}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
      />
      <button type="submit" className="button-main" disabled={!secret || busy}>
        {busy ? 'Opening…' : 'Open my data'}
      </button>
      <button type="button" className="button-quiet" onClick={() => (setMethod(method === 'passphrase' ? 'recovery' : 'passphrase'), setSecret(''))}>
        {method === 'passphrase' ? 'Use the recovery key instead' : 'Use the passphrase instead'}
      </button>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
