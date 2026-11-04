import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { MIN_PASSPHRASE_LENGTH as MIN_ACCOUNT_PASSWORD_LENGTH, type KeySetup } from '../../data/sync/keys';
import { PassphraseRequired, signInProviders, syncConfig } from '../../data/sync/supabase';
import { PasskeyCancelled } from '../../data/sync/passkeys';
import { ProviderButtons } from '../../app/family/ProviderButtons';
import { PasskeyOpen, PasskeySignIn, useOpeningPasskeys, usePasskeyAutofill } from '../../app/family/Passkey';
import { Passkeys } from './Passkeys';
import { StorageChoice } from './StorageChoice';
import {
  confirmCode,
  requestCode,
  signInWithEmailPassword,
  saveAccountPassword,
  changeAccountPassword,
  hasAccountPasswordForKeySetup,
  clearAccountPasswordReadyForSetup,
  clearAccountAuthPending,
  isAccountAuthPending,
  unlockWithAccountPassword,
  requestPasswordReset,
  confirmEncryption,
  prepareEncryption,
  deleteAccount,
  signOut,
  syncNow,
  refreshReminders,
  refreshSyncStatus,
  syncStatus,
  unlock,
  listAccountDevices,
  revokeAccountDevice,
  linkAccountPasswordToEncryption,
  changePassphrase,
  continueSetupPasskey,
  finishSetupWithPasskey,
  hasPassphrase,
  makeSetupPasskey,
  prepareKeysForPasskey,
  setupRecoveryKey,
  isAccountPasswordSetupPending,
} from '../../app/sync/syncController';
import { Waiting } from '../../lamplight/Waiting';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.');

export function useSyncStatus() {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
}

function SignIn() {
  const sync = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'choice' | 'verify' | 'password'>(() =>
    isAccountPasswordSetupPending() && sync.phase !== 'signed-out' && sync.phase !== 'unavailable' ? 'password' : 'choice',
  );
  const [mode, setMode] = useState<'signin' | 'create' | 'code'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const autofillError = usePasskeyAutofill(stage === 'choice');

  useEffect(() => {
    if (isAccountPasswordSetupPending() && sync.phase !== 'signed-out' && sync.phase !== 'unavailable' && stage === 'choice') setStage('password');
  }, [stage, sync.phase]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  if (stage === 'verify') return (
    <form className="stack-tight" onSubmit={(event: FormEvent) => {
      event.preventDefault();
      void run(async () => {
        await confirmCode(email, code, mode === 'create');
        // Email confirmation establishes the account session; account creation
        // continues immediately into the password step without a second login.
        setStage(mode === 'create' ? 'password' : 'choice');
      });
    }}>
      <p className="section-description">Enter the confirmation code sent to {email}.</p>
      <input className="field-input" autoComplete="one-time-code" aria-label="Email confirmation code" placeholder="Confirmation code" value={code} onChange={(event) => setCode(event.target.value)} />
      <button type="submit" className="button-accent account-wide" disabled={busy || code.trim().length < 6}>{busy ? 'Confirming…' : 'Confirm email'}</button>
      <button type="button" className="text-link" onClick={() => setStage('choice')}>Back</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );

  if (stage === 'password') return (
    <form className="stack-tight" onSubmit={(event: FormEvent) => {
      event.preventDefault();
      void run(async () => {
        if (password.length < 10) throw new Error('Use at least 10 characters for your password.');
        if (password !== again) throw new Error('The passwords do not match.');
        await saveAccountPassword(password);
        await refreshSyncStatus();
        // A new account now moves directly into encrypted-data setup. Existing
        // accounts remain on the locked screen until their password is linked.
        if (syncStatus.get().phase === 'locked') {
          try {
            await unlockWithAccountPassword();
          } catch {
            // Do not undo a valid account password. The locked view offers the
            // recovery key for a one-time migration when needed.
          }
        }
        const phase = syncStatus.get().phase;
        setPassword('');
        setAgain('');
        // needs-setup is rendered by AccountSection immediately after the
        // password step. Keeping the stage here would send a new account back
        // to the sign-in form instead of showing recovery-key setup.
        if (phase !== 'needs-setup') {
          clearAccountPasswordReadyForSetup();
          setStage('choice');
        }
      });
    }}>
      <p className="section-description">
        Your recovery key is the only fallback if you lose this password.
      </p>
      <input type="password" className="field-input" autoComplete="new-password" aria-label="Create password" placeholder="Create password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <input type="password" className="field-input" autoComplete="new-password" aria-label="Confirm password" placeholder="Confirm password" value={again} onChange={(event) => setAgain(event.target.value)} />
      <button type="submit" className="button-accent account-wide" disabled={busy || password.length < 10 || password !== again}>{busy ? 'Saving…' : 'Set password'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );

  return (
    <>
      <PasskeySignIn className="button-accent account-wide" errorClass="form-error" />
      <form className="stack-tight" onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void run(async () => {
          if (mode === 'signin') await signInWithEmailPassword(email, password);
          else {
            await requestCode(email, mode === 'create');
            setStage('verify');
          }
        });
      }}>
      <input type="email" className="field-input" autoComplete="username webauthn" inputMode="email" spellCheck={false} aria-label="Email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        {mode === 'signin' && <input type="password" className="field-input" autoComplete="current-password" aria-label="Password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />}
        <button type="submit" className="button-accent account-wide" disabled={busy || !email.includes('@') || (mode === 'signin' && !password)}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'create' ? 'Continue' : 'Send sign-in code'}</button>
      </form>
      <div className="chip-row">
        <button type="button" className="text-link" onClick={() => { setMode(mode === 'signin' ? 'create' : 'signin'); setError(''); }}>{mode === 'signin' ? 'Create an account' : 'Already have an account? Sign in'}</button>
        {mode === 'signin' && <button type="button" className="text-link" onClick={() => setMode('code')}>Sign in with an email code</button>}
        {mode === 'code' && <button type="button" className="text-link" onClick={() => setMode('signin')}>Use password instead</button>}
        {mode === 'signin' && <button type="button" className="text-link" onClick={() => void run(async () => { await requestPasswordReset(email); setNotice('Password reset email sent.'); })}>Forgot password?</button>}
      </div>
      {signInProviders.length > 0 && <details className="sheet__more"><summary>Other ways to sign in</summary><div className="sheet__more-body"><ProviderButtons className="chip account-wide" /></div></details>}
      {(error || autofillError) && <p className="form-error" role="alert">{error || autofillError}</p>}
      {notice && <p className="sheet__hint" role="status">{notice}</p>}
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

/** First device: the account password and recovery key protect encrypted data. */
function SetUp() {
  // Password is the stable account credential. A passkey remains available from the account page as a faster,
  // optional sign-in method after the encrypted data has been set up.
  const [stage, setStage] = useState<'passkey' | 'continue' | 'recovery' | 'password'>('password');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage === 'passkey') void prepareKeysForPasskey().catch(() => setStage('password'));
  }, [stage]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      if (cause instanceof PassphraseRequired) {
        setNote('This account needs its password connected to encrypted data.');
        setStage('password');
      } else if (!(cause instanceof PasskeyCancelled)) setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const noSecret = () => {
    setNote('This device’s passkey can sign you in, but your account password is still needed to protect the data.');
    setStage('password');
  };

  if (stage === 'password') return <PasswordSetUp note={note} />;

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
          <button type="button" className="text-link" onClick={() => setStage('password')}>
            {hasAccountPasswordForKeySetup() ? 'Skip passkey' : 'Use account password instead'}
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

function PasswordSetUp({ note }: { note: string }) {
  const [accountPasswordReady, setAccountPasswordReady] = useState(() => hasAccountPasswordForKeySetup());
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [setup, setSetup] = useState<KeySetup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountPasswordReady) void prepareEncryption().then(setSetup).catch((cause) => setError(message(cause)));
  }, [accountPasswordReady]);

  if (setup) {
    return (
      <>
        {accountPasswordReady && <p className="section-description">Your account password unlocks your encrypted data. Save this recovery key somewhere safe.</p>}
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

  if (accountPasswordReady) {
    return <div className="stack-tight">
      <p className="section-description">Preparing your encrypted account keys…</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>;
  }

  return (
    <form
      className="stack-tight"
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters for your password.`);
          if (password !== again) throw new Error('The passwords do not match.');
          await saveAccountPassword(password);
          setPassword('');
          setAgain('');
          setAccountPasswordReady(true);
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      {note && <p className="section-description">{note}</p>}
      <p className="section-description">You will only need the recovery key if you forget it.</p>
      <input type="password" className="field-input" autoComplete="new-password" aria-label="Account password" placeholder={`Account password, at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters`} value={password} onChange={(event) => setPassword(event.target.value)} />
      <input type="password" className="field-input" autoComplete="new-password" aria-label="Account password again" placeholder="Again" value={again} onChange={(event) => setAgain(event.target.value)} />
      <button type="submit" className="button-accent account-wide" disabled={busy || password.length < MIN_ACCOUNT_PASSWORD_LENGTH || password !== again}>{busy ? 'Saving…' : 'Set password'}</button>
      {password && again && password !== again && <p className="form-error">The passwords don’t match.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function Unlock() {
  const status = useSyncStatus();
  const [method, setMethod] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [withPasswordWrap, setWithPasswordWrap] = useState<boolean>();
  const opening = useOpeningPasskeys();
  const [typing, setTyping] = useState(false);
  useEffect(() => void hasPassphrase().then(setWithPasswordWrap), []);
  if (opening === undefined || withPasswordWrap === undefined) return null;

  if (opening.length > 0 && !typing) {
    return (
      <>
        {status.error && <p className="form-error" role="alert">{status.error}</p>}
        <PasskeyOpen rows={opening} className="button-accent account-wide" errorClass="form-error" />
        <button type="button" className="text-link" onClick={() => setTyping(true)}>
          Use account password
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setTyping(true);
            setMethod('recovery');
            setPassword('');
            setError('');
          }}
        >
          Use recovery key
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
          if (method === 'password') {
            if (!status.email) throw new Error('Sign in again before opening your data.');
            await signInWithEmailPassword(status.email, password);
          } else {
            await unlock(recoveryKey, 'recovery');
            // Existing accounts may still have their old storage column. Once
            // the recovery key opens the data, connect the account password so
            // the old passphrase is never needed again.
            if (password.length >= MIN_ACCOUNT_PASSWORD_LENGTH && status.email) {
              await signInWithEmailPassword(status.email, password);
              await linkAccountPasswordToEncryption(password, recoveryKey, 'recovery');
            }
          }
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      {status.error && <p className="form-error" role="alert">{status.error}</p>}
      {(method === 'password' || !withPasswordWrap) && (
        <input
          type="password"
          className="field-input"
          autoComplete="current-password"
          aria-label="Account password"
          placeholder="Account password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      )}
      {method === 'recovery' && (
        <>
          <input
            type="text"
            className="field-input"
            autoComplete="off"
            aria-label="Recovery key"
            placeholder="Recovery key"
            value={recoveryKey}
            onChange={(event) => setRecoveryKey(event.target.value)}
          />
          {!withPasswordWrap && <p className="sheet__hint">Enter your account password above to connect it while this recovery key opens your data.</p>}
        </>
      )}
      <button type="submit" className="button-accent account-wide" disabled={busy || (method === 'password' ? !password : !recoveryKey)}>
        {busy ? <Waiting>Opening…</Waiting> : method === 'password' ? 'Open with password' : 'Open with recovery key'}
      </button>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          setMethod(method === 'password' ? 'recovery' : 'password');
          setRecoveryKey('');
          setError('');
        }}
      >
        {method === 'password' ? 'Use recovery key' : 'Use account password'}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

/** Session controls. Supabase's client API does not enumerate all account sessions, so this view
 * deliberately identifies only this browser and offers account-wide revocation. */
function DeviceSessions() {
  const [expanded, setExpanded] = useState(false);
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof listAccountDevices>>>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    try { setDevices(await listAccountDevices()); }
    catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }

  return (
    <section className="settings-sub">
      <button type="button" className="text-link" aria-expanded={expanded} onClick={() => {
        const next = !expanded; setExpanded(next); if (next) void refresh();
      }}>
        {expanded ? 'Hide devices & sessions' : 'Devices & sessions'}
      </button>
      {expanded && (
        <div className="stack-tight">
          {loading && <p className="sheet__hint">Loading devices…</p>}
          {!loading && devices.length === 0 && <p className="sheet__hint">No registered devices yet.</p>}
          {devices.map((device) => (
            <div className="settings-sub" key={device.id}>
              <div className="row-between">
                <div>
                  <p className="label">{device.label}</p>
                  <p className="sheet__hint">{device.platform} · {device.app_ids.join(', ') || 'Proairetos'}</p>
                  <p className="sheet__hint">Last active {new Date(device.last_seen_at).toLocaleString()}</p>
                  {device.revoked_at && <p className="form-error">Revoked</p>}
                </div>
                {!device.revoked_at && (
                  <button type="button" className="text-link" disabled={busyId === device.id} onClick={async () => {
                    setBusyId(device.id); setError('');
                    try {
                      await revokeAccountDevice(device.id);
                      await refresh();
                    } catch (cause) { setError(message(cause)); }
                    finally { setBusyId(''); }
                  }}>{busyId === device.id ? 'Revoking…' : 'Revoke'}</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="text-link" onClick={() => void refresh()} disabled={loading}>Refresh device list</button>
          {!confirmingAll ? (
            <button type="button" className="text-link" onClick={() => setConfirmingAll(true)}>Sign out everywhere…</button>
          ) : (
            <>
              <p className="section-description">This revokes refreshable sessions for the account. You will need to sign in again on your devices.</p>
              <div className="chip-row">
                <button type="button" className="button-quiet" onClick={() => setConfirmingAll(false)}>Cancel</button>
                <button type="button" className="chip" onClick={() => void signOut()}>Sign out everywhere</button>
              </div>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}

function PasswordChange() {
  const status = useSyncStatus();
  const [method, setMethod] = useState<'password' | 'recovery'>('password');
  const [current, setCurrent] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessageText('');
    try {
      if (next.length < MIN_ACCOUNT_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters for your new password.`);
      if (next !== again) throw new Error('The new passwords do not match.');
      if (method === 'password') {
        if (!status.email) throw new Error('Sign in again before changing your password.');
        if (!current) throw new Error('Enter your current password.');
        await signInWithEmailPassword(status.email, current);
        if (syncStatus.get().phase !== 'ready') throw new Error('Open your data with the recovery key once, then change the password here.');
        await changeAccountPassword(next);
        await changePassphrase(current, 'passphrase', next);
      } else {
        if (!recoveryKey.trim()) throw new Error('Enter your recovery key.');
        await unlock(recoveryKey.trim(), 'recovery');
        await changeAccountPassword(next);
        await linkAccountPasswordToEncryption(next, recoveryKey.trim(), 'recovery');
      }
      setCurrent('');
      setRecoveryKey('');
      setNext('');
      setAgain('');
      setMessageText('Your password has been changed. Your recovery key is still the same.');
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="settings-sub account-password-change">
      <summary>Change password</summary>
      <div className="stack-tight">
        <p className="section-description">Use your recovery key if you no longer know the current password.</p>
        <div className="chip-row" role="group" aria-label="Password change method">
          <button type="button" className={method === 'password' ? 'chip' : 'button-quiet'} onClick={() => { setMethod('password'); setError(''); }}>Current password</button>
          <button type="button" className={method === 'recovery' ? 'chip' : 'button-quiet'} onClick={() => { setMethod('recovery'); setError(''); }}>Recovery key</button>
        </div>
        <form className="stack-tight" onSubmit={(event) => void submit(event)}>
          {method === 'password' ? (
            <input className="field-input" type="password" autoComplete="current-password" aria-label="Current password" placeholder="Current password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          ) : (
            <input className="field-input" type="text" autoComplete="off" aria-label="Recovery key" placeholder="Recovery key" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} />
          )}
          <input className="field-input" type="password" autoComplete="new-password" aria-label="New password" placeholder="New password" value={next} onChange={(event) => setNext(event.target.value)} />
          <input className="field-input" type="password" autoComplete="new-password" aria-label="Confirm new password" placeholder="Confirm new password" value={again} onChange={(event) => setAgain(event.target.value)} />
          <button type="submit" className="button-accent" disabled={busy || next.length < MIN_ACCOUNT_PASSWORD_LENGTH || next !== again}>{busy ? 'Changing…' : 'Change password'}</button>
        </form>
        {messageText && <p className="sheet__hint" role="status">{messageText}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </details>
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
      <PasswordChange />
      <Passkeys />
      <DeviceSessions />

      <details className="sheet__more account-more">
        <summary>More</summary>
        <div className="sheet__more-body stack-tight">
          <StorageChoice />
          <SystemCheck />
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

  useEffect(() => {
    if (isAccountAuthPending() && status.phase !== 'signed-out' && status.phase !== 'unavailable') clearAccountAuthPending();
  }, [status.phase]);

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
      {(status.phase === 'signed-out' || isAccountPasswordSetupPending()) && <SignIn />}
      {status.phase === 'needs-setup' && !isAccountPasswordSetupPending() && <SetUp />}
      {status.phase === 'locked' && <Unlock />}
      {status.phase === 'ready' && <Ready />}
    </section>
  );
}
