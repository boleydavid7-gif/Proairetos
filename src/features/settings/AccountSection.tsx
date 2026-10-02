import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { MIN_PASSPHRASE_LENGTH, type KeySetup } from '../../data/sync/keys';
import { syncConfig } from '../../data/sync/supabase';
import {
  confirmCode,
  requestCode,
  confirmEncryption,
  prepareEncryption,
  deleteAccount,
  signOut,
  syncNow,
  syncStatus,
  unlock,
} from '../../app/sync/syncController';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.');

export function useSyncStatus() {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="section-description">
        Sign in to keep your data in sync across your devices. It is encrypted on this phone before it is uploaded.
      </p>
      {!sent ? (
        <form
          className="inline-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            run(async () => {
              await requestCode(email);
              setSent(true);
            });
          }}
        >
          <input
            type="email"
            className="field-input"
            autoComplete="email"
            aria-label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!email.includes('@') || busy}>
            Send code
          </button>
        </form>
      ) : (
        <form
          className="stack-tight"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            run(() => confirmCode(email, code));
          }}
        >
          <p className="sheet__hint">
            We sent an email to {email}. It can take a minute to arrive. If it has a code, enter it below. If it has a
            link instead, long-press the link, choose Copy, and paste it below. Do not open the link first.
          </p>
          <div className="inline-form">
            <input
              autoComplete="one-time-code"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="field-input"
              aria-label="Code or link from the email"
              placeholder="Code or link from the email"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button type="submit" className="button-accent" disabled={code.trim().length < 6 || busy}>
              Sign in
            </button>
          </div>
          <button type="button" className="text-link" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}

function SetUp() {
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [setup, setSetup] = useState<KeySetup | null>(null);
  const [savedIt, setSavedIt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (setup) {
    return (
      <div className="stack-tight">
        <p className="sheet__label">Your recovery key</p>
        <p className="recovery-key" aria-label="Recovery key">{setup.recoveryKey}</p>
        <p className="section-description">
          Write this down and keep it somewhere safe, away from your phone. If you forget your passphrase, this is the only
          way back into your data. It will not be shown again, and we cannot recover it for you.
        </p>
        <label className="toggle-check">
          <input type="checkbox" checked={savedIt} onChange={(event) => setSavedIt(event.target.checked)} />
          <span>I have written down my recovery key</span>
        </label>
        <button
          type="button"
          className="chip chip--accent chip--wide"
          disabled={!savedIt || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await confirmEncryption(setup);
            } catch (cause) {
              setError(message(cause));
              setBusy(false);
            }
          }}
        >
          {busy ? 'Starting…' : 'Start syncing'}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form
      className="stack-tight"
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          setSetup(await prepareEncryption(passphrase));
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="section-description">
        Choose a passphrase. It locks your data before it leaves this phone, so not even the server can read it. You will
        need it on each new device.
      </p>
      <input
        type="password"
        className="field-input"
        autoComplete="new-password"
        aria-label="Passphrase"
        placeholder={`Passphrase, at least ${MIN_PASSPHRASE_LENGTH} characters`}
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
      />
      <input
        type="password"
        className="field-input"
        autoComplete="new-password"
        aria-label="Passphrase again"
        placeholder="The same passphrase again"
        value={again}
        onChange={(event) => setAgain(event.target.value)}
      />
      <p className="sheet__hint">A few unrelated words are easy to remember and hard to guess.</p>
      <button
        type="submit"
        className="chip chip--accent chip--wide"
        disabled={busy || passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase !== again}
      >
        {busy ? 'Creating your keys…' : 'Turn on encrypted sync'}
      </button>
      {passphrase && again && passphrase !== again && <p className="form-error">The two passphrases do not match.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function Unlock() {
  const [method, setMethod] = useState<'passphrase' | 'recovery'>('passphrase');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="stack-tight"
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          await unlock(secret, method);
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="section-description">
        {method === 'passphrase'
          ? 'Enter your passphrase to open your data on this device.'
          : 'Enter the recovery key you wrote down when you set up sync.'}
      </p>
      <input
        type={method === 'passphrase' ? 'password' : 'text'}
        className="field-input"
        autoComplete={method === 'passphrase' ? 'current-password' : 'off'}
        aria-label={method === 'passphrase' ? 'Passphrase' : 'Recovery key'}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
      />
      <button type="submit" className="chip chip--accent chip--wide" disabled={!secret || busy}>
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          setMethod(method === 'passphrase' ? 'recovery' : 'passphrase');
          setSecret('');
          setError('');
        }}
      >
        {method === 'passphrase' ? 'Use my recovery key instead' : 'Use my passphrase instead'}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function Ready() {
  const status = useSyncStatus();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <div className="stack-tight">
      <p className="section-description">
        Signed in as {status.email}. Your data is end-to-end encrypted.
        <br />
        {status.syncing
          ? 'Syncing…'
          : status.lastSyncedAt
            ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}.`
            : 'Not synced yet.'}
      </p>
      {status.error && <p className="form-error" role="alert">{status.error}</p>}
      <button type="button" className="chip chip--wide" disabled={status.syncing} onClick={() => void syncNow()}>
        Sync now
      </button>

      <p className="sheet__hint">Notifications, including when the app is closed, are in Settings, Notifications.</p>

      {confirmingSignOut ? (
        <div className="chip-row">
          <button type="button" className="button-quiet" onClick={() => setConfirmingSignOut(false)}>
            Stay signed in
          </button>
          <button type="button" className="chip" onClick={() => void signOut()}>
            Sign out of this device
          </button>
        </div>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirmingSignOut(true)}>
          Sign out
        </button>
      )}
      {confirmingSignOut && (
        <p className="sheet__hint">Your data stays on this device and in your encrypted account. Sync stops until you sign in again.</p>
      )}

      <DeleteAccount />
    </div>
  );
}

/** Removes the account and everything on the server. Confirmed in two steps; this device keeps its copy. */
function DeleteAccount() {
  const [step, setStep] = useState<'closed' | 'confirm'>('closed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (step === 'closed') {
    return (
      <button type="button" className="text-link account-delete" onClick={() => setStep('confirm')}>
        Delete my account and server data…
      </button>
    );
  }

  return (
    <div className="settings-sub">
      <p className="sheet__label">Delete my account</p>
      <p className="section-description">
        Removes your account and everything stored on the server: your encrypted data, keys, reminder times, and any
        calendar link. Other devices are signed out. Everything on this device stays here, so download a backup first if
        you want a copy elsewhere. This cannot be undone.
      </p>
      <div className="chip-row">
        <button type="button" className="button-quiet" onClick={() => setStep('closed')}>
          Keep my account
        </button>
        <button
          type="button"
          className="chip"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await deleteAccount();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'That did not finish. Try again.');
              setBusy(false);
            }
          }}
        >
          {busy ? 'Deleting…' : 'Yes, delete my account'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * For whoever sets up the server: which build settings this copy of the
 * app was given, and when it was built. Shows only that a value is
 * present, never the value.
 */
function SetupCheck() {
  const built = typeof __BUILT_AT__ === 'string' ? new Date(__BUILT_AT__) : null;
  const rows: [string, boolean][] = [
    ['VITE_SUPABASE_URL', Boolean(syncConfig.url)],
    ['VITE_SUPABASE_ANON_KEY', Boolean(syncConfig.anonKey)],
    ['VITE_VAPID_PUBLIC_KEY', Boolean(syncConfig.vapidPublicKey)],
  ];
  return (
    <details className="setup-check">
      <summary>Setting up the server?</summary>
      <ul>
        {rows.map(([name, present]) => (
          <li key={name}>
            <code>{name}</code>: {present ? 'received' : 'not in this build'}
          </li>
        ))}
      </ul>
      {built && (
        <p className="sheet__hint">
          This copy was built{' '}
          {built.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
        </p>
      )}
    </details>
  );
}

export default function AccountSection() {
  const status = useSyncStatus();

  if (status.phase === 'unavailable') {
    return (
      <section className="settings-card" aria-label="Account and sync">
        <h2 className="section-label">Account and sync</h2>
        <p className="section-description">Sync is not set up for this app yet. Everything stays on this device.</p>
        <SetupCheck />
      </section>
    );
  }

  return (
    <section className="settings-card" aria-label="Account and sync">
      <h2 className="section-label">Account and sync</h2>
      {status.phase === 'signed-out' && <SignIn />}
      {status.phase === 'needs-setup' && <SetUp />}
      {status.phase === 'locked' && <Unlock />}
      {status.phase === 'ready' && <Ready />}
    </section>
  );
}
