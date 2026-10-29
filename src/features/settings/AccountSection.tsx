import { SignInAnotherApp } from '../../app/family/SignInPass';
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { MIN_PASSPHRASE_LENGTH, type KeySetup } from '../../data/sync/keys';
import { PassphraseRequired, signInProviders, syncConfig } from '../../data/sync/supabase';
import { PasskeyCancelled } from '../../data/sync/passkeys';
import { ProviderButtons } from '../../app/family/ProviderButtons';
import { PasskeyOpen, PasskeySignIn, useOpeningPasskeys, usePasskeyAutofill } from '../../app/family/Passkey';
import { Passkeys } from './Passkeys';
import { StorageChoice } from './StorageChoice';
import {
  confirmCode,
  requestCode,
  confirmEncryption,
  prepareEncryption,
  deleteAccount,
  signOut,
  syncNow,
  refreshReminders,
  refreshSyncStatus,
  syncStatus,
  unlock,
  changePassphrase,
  continueSetupPasskey,
  finishSetupWithPasskey,
  hasPassphrase,
  makeSetupPasskey,
  passkeysAvailable,
  prepareKeysForPasskey,
  setupRecoveryKey,
} from '../../app/sync/syncController';
import { Waiting } from '../../lamplight/Waiting';

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
  const autofillError = usePasskeyAutofill(!sent);

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

  if (sent) {
    return (
      <form
        className="stack-tight"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          run(() => confirmCode(email, code));
        }}
      >
        <p className="section-description">Code sent to {email}.</p>
        <input
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="field-input"
          aria-label="Code or link from the email"
          placeholder="Code or link"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="submit" className="button-accent account-wide" disabled={code.trim().length < 6 || busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" className="text-link" onClick={() => setSent(false)}>
          Use a different email
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <>
      <PasskeySignIn className="button-accent account-wide" errorClass="form-error" />
      <form
        className="stack-tight"
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
          autoComplete="email webauthn"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="chip account-wide" disabled={!email.includes('@') || busy}>
          {busy ? 'Sending…' : 'Continue with email'}
        </button>
      </form>
      {signInProviders.length > 0 && (
        <details className="sheet__more">
          <summary>Other ways to sign in</summary>
          <div className="sheet__more-body">
            <ProviderButtons className="chip account-wide" />
          </div>
        </details>
      )}
      {(error || autofillError) && <p className="form-error" role="alert">{error || autofillError}</p>}
    </>
  );
}

/** The recovery key, shown once: copy it, say it is kept, and go on. */
function RecoveryKey({ value, busy, onSaved }: { value: string; busy: boolean; onSaved: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack-tight">
      <p className="sheet__label">Your recovery key</p>
      <p className="recovery-key" aria-label="Recovery key">{value}</p>
      <p className="section-description">It opens your data if you lose your passkeys. Keep it somewhere safe, away from this device. It is shown only now.</p>
      {navigator.clipboard?.writeText && (
        <button type="button" className="chip account-wide" onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      <button type="button" className="button-accent account-wide" disabled={busy} onClick={onSaved}>
        {busy ? 'Starting…' : 'I’ve saved it'}
      </button>
    </div>
  );
}

/** First device: a passkey locks and opens the data; a passphrase is the way for devices without passkeys. */
function SetUp() {
  const [stage, setStage] = useState<'passkey' | 'continue' | 'recovery' | 'passphrase'>(passkeysAvailable() ? 'passkey' : 'passphrase');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage === 'passkey') void prepareKeysForPasskey().catch(() => setStage('passphrase'));
  }, [stage]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      if (cause instanceof PassphraseRequired) {
        setNote('This server still needs a passphrase. Choose one; your passkey signs you in.');
        setStage('passphrase');
      } else if (!(cause instanceof PasskeyCancelled)) setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const noSecret = () => {
    setNote('This device’s passkey can sign you in but cannot lock your data. Choose a passphrase for that.');
    setStage('passphrase');
  };

  if (stage === 'passphrase') return <PassphraseSetUp note={note} />;

  return (
    <div className="stack-tight">
      {stage === 'passkey' && (
        <>
          <button
            type="button"
            className="button-accent account-wide"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const next = await makeSetupPasskey();
                if (next === 'no-secret') noSecret();
                else setStage(next);
              })
            }
          >
            {busy ? 'Making it…' : 'Create a passkey'}
          </button>
          <button type="button" className="text-link" onClick={() => setStage('passphrase')}>
            Use a passphrase instead
          </button>
        </>
      )}
      {stage === 'continue' && (
        <>
          <p className="section-description">One more Face ID lets the passkey open your data.</p>
          <button
            type="button"
            className="button-accent account-wide"
            disabled={busy}
            onClick={() => void run(async () => ((await continueSetupPasskey()) ? setStage('recovery') : noSecret()))}
          >
            {busy ? 'Asking…' : 'Continue'}
          </button>
        </>
      )}
      {stage === 'recovery' && <RecoveryKey value={setupRecoveryKey()} busy={busy} onSaved={() => void run(finishSetupWithPasskey)} />}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

function PassphraseSetUp({ note }: { note: string }) {
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [setup, setSetup] = useState<KeySetup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (setup) {
    return (
      <>
        <RecoveryKey
          value={setup.recoveryKey}
          busy={busy}
          onSaved={async () => {
            setBusy(true);
            setError('');
            try {
              await confirmEncryption(setup);
            } catch (cause) {
              setError(message(cause));
              setBusy(false);
            }
          }}
        />
        {error && <p className="form-error" role="alert">{error}</p>}
      </>
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
      {note && <p className="section-description">{note}</p>}
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
        placeholder="Again"
        value={again}
        onChange={(event) => setAgain(event.target.value)}
      />
      <button
        type="submit"
        className="button-accent account-wide"
        disabled={busy || passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase !== again}
      >
        {busy ? 'Making your keys…' : 'Continue'}
      </button>
      {passphrase && again && passphrase !== again && <p className="form-error">The passphrases don’t match.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function Unlock() {
  const [method, setMethod] = useState<'passphrase' | 'recovery'>('passphrase');
  const [secret, setSecret] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [withPassphrase, setWithPassphrase] = useState<boolean>();
  useEffect(() => void hasPassphrase().then(setWithPassphrase), []);
  // With a passkey that opens the data, it is the way in; the passphrase or recovery key is one link away.
  const opening = useOpeningPasskeys();
  const [typing, setTyping] = useState(false);
  if (opening === undefined || withPassphrase === undefined) return null;
  const recovery = method === 'recovery' || !withPassphrase;
  // A forgotten passphrase is replaced; an account without one simply opens.
  const choosing = recovery && withPassphrase;
  const ready = Boolean(secret) && (!choosing || (next.length >= MIN_PASSPHRASE_LENGTH && next === again));

  if (opening.length > 0 && !typing) {
    return (
      <>
        <PasskeyOpen rows={opening} className="button-accent account-wide" errorClass="form-error" />
        <button type="button" className="text-link" onClick={() => setTyping(true)}>
          {withPassphrase ? 'Use my passphrase' : 'Use my recovery key'}
        </button>
      </>
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
          if (choosing) await changePassphrase(secret, 'recovery', next);
          // Without a passkey that opens the data here, the next tap makes one (offered on the next screen).
          await unlock(secret, recovery ? 'recovery' : 'passphrase', passkeysAvailable() && !opening.length);
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type={recovery ? 'text' : 'password'}
        className="field-input"
        autoComplete={recovery ? 'off' : 'current-password'}
        aria-label={recovery ? 'Recovery key' : 'Passphrase'}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
      />
      {choosing && (
        <>
          <input type="password" className="field-input" autoComplete="new-password" aria-label="New passphrase" placeholder="New passphrase" value={next} onChange={(event) => setNext(event.target.value)} />
          <input type="password" className="field-input" autoComplete="new-password" aria-label="New passphrase again" placeholder="Again" value={again} onChange={(event) => setAgain(event.target.value)} />
          {next && next.length < MIN_PASSPHRASE_LENGTH && <p className="sheet__hint">At least {MIN_PASSPHRASE_LENGTH} characters.</p>}
          {next && again && next !== again && <p className="form-error">The passphrases don’t match.</p>}
        </>
      )}
      <button type="submit" className="button-accent account-wide" disabled={!ready || busy}>
        {busy ? <Waiting>Opening…</Waiting> : 'Open'}
      </button>
      {withPassphrase && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setMethod(method === 'passphrase' ? 'recovery' : 'passphrase');
            setSecret('');
            setNext('');
            setAgain('');
            setError('');
          }}
        >
          {method === 'passphrase' ? 'Forgot your passphrase?' : 'Use my passphrase instead'}
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

/** A new passphrase while signed in (the current one, or the recovery key on an account that has none yet). */
function ChangePassphrase() {
  const [open, setOpen] = useState(false);
  const [withPassphrase, setWithPassphrase] = useState(true);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => void hasPassphrase().then(setWithPassphrase), [done]);
  const title = withPassphrase ? 'Change passphrase' : 'Add a passphrase';

  if (!open) {
    return (
      <>
        <button type="button" className="text-link" onClick={() => (setOpen(true), setDone(false))}>
          {title}
        </button>
        {done && <p className="sheet__hint" role="status">Passphrase saved.</p>}
      </>
    );
  }
  return (
    <form
      className="settings-sub stack-tight"
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          await changePassphrase(current, withPassphrase ? 'passphrase' : 'recovery', next);
          setOpen(false);
          setDone(true);
          setCurrent('');
          setNext('');
          setAgain('');
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="sheet__label">{title}</p>
      <input
        type={withPassphrase ? 'password' : 'text'}
        className="field-input"
        autoComplete={withPassphrase ? 'current-password' : 'off'}
        aria-label={withPassphrase ? 'Current passphrase' : 'Recovery key'}
        placeholder={withPassphrase ? 'Current passphrase' : 'Recovery key'}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
      />
      <input type="password" className="field-input" autoComplete="new-password" aria-label="New passphrase" placeholder="New passphrase" value={next} onChange={(event) => setNext(event.target.value)} />
      <input type="password" className="field-input" autoComplete="new-password" aria-label="New passphrase again" placeholder="Again" value={again} onChange={(event) => setAgain(event.target.value)} />
      {next && next.length < MIN_PASSPHRASE_LENGTH && <p className="sheet__hint">At least {MIN_PASSPHRASE_LENGTH} characters.</p>}
      {next && again && next !== again && <p className="form-error">The passphrases don’t match.</p>}
      <div className="chip-row">
        <button type="button" className="button-quiet" onClick={() => (setOpen(false), setError(''))}>Cancel</button>
        <button type="submit" className="chip chip--accent" disabled={!current || next.length < MIN_PASSPHRASE_LENGTH || next !== again || busy}>
          {busy ? <Waiting>Saving…</Waiting> : 'Save'}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function Ready() {
  const status = useSyncStatus();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const synced = status.syncing
    ? 'Syncing…'
    : status.lastSyncedAt
      ? `Synced ${new Date(status.lastSyncedAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}`
      : 'Not synced yet';

  return (
    <div className="stack-tight">
      <div className="account-head">
        <p className="account-head__email">{status.email}</p>
        <p className="sheet__hint">
          {synced} ·{' '}
          <button type="button" className="text-link account-head__sync" disabled={status.syncing} onClick={() => void syncNow()}>
            Sync now
          </button>
        </p>
      </div>
      {status.kept ? (
        <p className="sheet__hint">
          {status.kept === 1 ? 'One thing was' : `${status.kept} things were`} changed on two devices at once; this device’s version was kept.
        </p>
      ) : null}
      {status.error && <p className="form-error" role="alert">{status.error}</p>}
      <Passkeys />
      <SignInAnotherApp />

      <details className="sheet__more account-more">
        <summary>More</summary>
        <div className="sheet__more-body stack-tight">
          <StorageChoice />
          <SystemCheck />
          <ChangePassphrase />
          <DeleteAccount />
        </div>
      </details>

      {confirmingSignOut ? (
        <>
          <p className="sheet__hint">Your data stays on this device and in your account. Sync stops until you sign in again.</p>
          <div className="chip-row">
            <button type="button" className="button-quiet" onClick={() => setConfirmingSignOut(false)}>
              Stay signed in
            </button>
            <button type="button" className="chip" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirmingSignOut(true)}>
          Sign out
        </button>
      )}
    </div>
  );
}

type StorageCheck = {
  supported: boolean;
  usage?: number;
  quota?: number;
  persisted?: boolean;
  error?: string;
};

const size = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

function useStorageCheck() {
  const [check, setCheck] = useState<StorageCheck | null>(null);

  async function run() {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setCheck({ supported: false });
      return;
    }
    try {
      const [estimate, persisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(false),
      ]);
      setCheck({ supported: true, usage: estimate.usage, quota: estimate.quota, persisted });
    } catch (cause) {
      setCheck({ supported: true, error: cause instanceof Error ? cause.message : 'Storage details unavailable.' });
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return { check, run };
}

function SystemCheck() {
  const status = useSyncStatus();
  const { check, run: checkStorage } = useStorageCheck();
  const [busy, setBusy] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy details');
  const online = typeof navigator === 'undefined' || navigator.onLine;
  const storagePercent = check?.usage !== undefined && check.quota ? Math.round((check.usage / check.quota) * 100) : null;
  const storageLabel = !check
    ? 'Checking…'
    : !check.supported
      ? 'Browser did not report storage details'
      : check.error
        ? check.error
        : check.usage !== undefined && check.quota
          ? `${size(check.usage)} used of ${size(check.quota)}${storagePercent !== null ? ` (${storagePercent}%)` : ''}`
          : 'Available';
  const reminderLabel =
    status.reminders === 'on'
      ? 'Enabled on this device'
      : status.reminders === 'off'
        ? 'Not enabled on this device'
        : status.reminders === 'blocked'
          ? 'Blocked in browser settings'
          : 'Unavailable in this browser or build';
  const checkAgain = async () => {
    setBusy(true);
    try {
      await Promise.allSettled([refreshSyncStatus(), refreshReminders(), checkStorage()]);
    } finally {
      setBusy(false);
    }
  };
  const copyDetails = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyLabel('Copy unavailable');
      return;
    }
    const details = [
      'Proairetos system check',
      `Connection: ${online ? 'online' : 'offline'}`,
      `Account sync: ${status.error ? 'needs attention' : status.syncing ? 'syncing' : status.lastSyncedAt ? 'connected' : 'ready'}`,
      `Reminders: ${reminderLabel}`,
      `Device storage: ${storageLabel}`,
      `Web reminder service: ${syncConfig.vapidPublicKey ? 'configured' : 'not configured'}`,
      `Checked: ${new Date().toISOString()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(details);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy details'), 1800);
    } catch {
      setCopyLabel('Copy unavailable');
    }
  };

  return (
    <section className="system-check" aria-label="System check">
      <div className="system-check__head">
        <div>
          <h3 className="settings-group__label">System check</h3>
        </div>
        <div className="system-check__actions">
          <button type="button" className="text-link" disabled={busy} onClick={() => void checkAgain()}>
            {busy ? <Waiting>Checking…</Waiting> : 'Check again'}
          </button>
          <button type="button" className="text-link" onClick={() => void copyDetails()}>
            {copyLabel}
          </button>
        </div>
      </div>
      <dl className="system-check__list">
        <div className="system-check__row">
          <dt>Connection</dt>
          <dd>{online ? 'Online' : 'Offline'}</dd>
        </div>
        <div className="system-check__row">
          <dt>Account sync</dt>
          <dd>{status.error ? 'Needs attention' : status.syncing ? 'Syncing…' : status.lastSyncedAt ? 'Connected' : 'Ready'}</dd>
        </div>
        <div className="system-check__row">
          <dt>Reminders</dt>
          <dd>{reminderLabel}</dd>
        </div>
        <div className="system-check__row">
          <dt>Device storage</dt>
          <dd>{storageLabel}</dd>
        </div>
        <div className="system-check__row">
          <dt>Web reminder service</dt>
          <dd>{syncConfig.vapidPublicKey ? 'Configured' : 'Not configured'}</dd>
        </div>
      </dl>
      {status.error && <p className="form-error" role="status">{status.error}</p>}
      {storagePercent !== null && storagePercent >= 85 && <p className="form-error" role="status">Device storage is nearly full.</p>}
      {check?.persisted === false && <p className="sheet__hint">The browser may clear local data when space is tight. Back up from Settings.</p>}
    </section>
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
        Deletes your account and everything on the server: encrypted data, keys, reminder times and any calendar link.
        Other devices sign out. This device keeps its copy; back up first if you want one elsewhere. This can’t be
        undone.
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
      {status.phase === 'signed-out' && <SignIn />}
      {status.phase === 'needs-setup' && <SetUp />}
      {status.phase === 'locked' && <Unlock />}
      {status.phase === 'ready' && <Ready />}
    </section>
  );
}
