import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { MIN_PASSPHRASE_LENGTH, type KeySetup } from '../../data/sync/keys';
import { confirmCode, confirmEncryption, prepareEncryption, requestCode, signOut, syncNow, syncStatus, unlock } from '../../app/sync/syncController';

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'That did not finish. Try again.';
}

function SignInPanel() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } };
  if (sent) return <form className="theoria-account-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(() => confirmCode(email, code)); }}><p className="theoria-account-note">Check {email} for a code or sign-in link.</p><input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" autoCapitalize="off" autoCorrect="off" aria-label="Code or sign-in link" placeholder="Code or sign-in link" /><div className="theoria-account-actions"><button type="submit" className="theoria-primary-button" disabled={busy || code.trim().length < 6}>{busy ? 'Signing in…' : 'Sign in'}</button><button type="button" className="theoria-secondary-button" onClick={() => { setSent(false); setCode(''); }}>Change email</button></div>{error && <p className="theoria-form-error" role="alert">{error}</p>}</form>;
  return <form className="theoria-account-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(async () => { await requestCode(email); setSent(true); }); }}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-label="Email" placeholder="you@example.com" /><button type="submit" className="theoria-primary-button" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Send sign-in code'}</button>{error && <p className="theoria-form-error" role="alert">{error}</p>}</form>;
}

function SetupPanel() {
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [setup, setSetup] = useState<KeySetup>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (setup) return <div className="theoria-account-form"><p className="theoria-account-note">Save this recovery key before syncing on another device.</p><code className="theoria-recovery-key">{setup.recoveryKey}</code><label className="theoria-check-label"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> I saved this key</label><button type="button" className="theoria-primary-button" disabled={!saved || busy} onClick={async () => { setBusy(true); setError(''); try { await confirmEncryption(setup); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } }}>{busy ? 'Starting sync…' : 'Start sync'}</button>{error && <p className="theoria-form-error" role="alert">{error}</p>}</div>;
  return <form className="theoria-account-form" onSubmit={async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { setSetup(await prepareEncryption(passphrase)); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } }}><p className="theoria-account-note">Choose a passphrase to protect your library before it leaves this device.</p><input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" aria-label="Sync passphrase" placeholder={`Passphrase, at least ${MIN_PASSPHRASE_LENGTH} characters`} /><input type="password" value={again} onChange={(event) => setAgain(event.target.value)} autoComplete="new-password" aria-label="Sync passphrase again" placeholder="Repeat the passphrase" /><button type="submit" className="theoria-primary-button" disabled={busy || passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase !== again}>{busy ? 'Preparing sync…' : 'Set up encrypted sync'}</button>{passphrase && again && passphrase !== again && <p className="theoria-form-error">The passphrases do not match.</p>}{error && <p className="theoria-form-error" role="alert">{error}</p>}</form>;
}

function UnlockPanel() {
  const [method, setMethod] = useState<'passphrase' | 'recovery'>('passphrase');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="theoria-account-form" onSubmit={async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await unlock(secret, method); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } }}><p className="theoria-account-note">Unlock your encrypted library on this device.</p><input type={method === 'passphrase' ? 'password' : 'text'} value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete={method === 'passphrase' ? 'current-password' : 'off'} aria-label={method === 'passphrase' ? 'Passphrase' : 'Recovery key'} placeholder={method === 'passphrase' ? 'Passphrase' : 'Recovery key'} /><button type="submit" className="theoria-primary-button" disabled={busy || !secret}>{busy ? 'Unlocking…' : 'Unlock library'}</button><button type="button" className="theoria-account-link" onClick={() => { setMethod(method === 'passphrase' ? 'recovery' : 'passphrase'); setSecret(''); setError(''); }}>{method === 'passphrase' ? 'Use recovery key' : 'Use passphrase'}</button>{error && <p className="theoria-form-error" role="alert">{error}</p>}</form>;
}

function ReadyPanel({ email }: { email?: string }) {
  const status = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const [confirming, setConfirming] = useState(false);
  return <div className="theoria-account-form"><p className="theoria-account-note">{email ? `Signed in as ${email}.` : 'Signed in to Proairetos.'} {status.syncing ? 'Syncing…' : status.lastSyncedAt ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}.` : 'Ready to sync.'}</p>{status.error && <p className="theoria-form-error" role="alert">{status.error}</p>}<button type="button" className="theoria-primary-button" disabled={status.syncing} onClick={() => void syncNow()}>{status.syncing ? 'Syncing…' : 'Sync now'}</button>{confirming ? <div className="theoria-account-actions"><button type="button" className="theoria-secondary-button" onClick={() => setConfirming(false)}>Stay signed in</button><button type="button" className="theoria-danger-button" onClick={() => void signOut()}>Sign out</button></div> : <button type="button" className="theoria-account-link" onClick={() => setConfirming(true)}>Sign out of this device</button>}</div>;
}

export default function TheoriaAccountPanel() {
  const status = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  return <section className="theoria-account-panel" aria-label="Proairetos account and sync"><div className="theoria-section-heading"><div><p className="theoria-eyebrow">Account</p><h2>Proairetos account</h2></div><span className={'theoria-account-status theoria-account-status--' + status.phase}>{status.phase === 'ready' ? 'Synced' : status.phase === 'signed-out' ? 'Sign in' : status.phase === 'unavailable' ? 'On this device' : 'Finish setup'}</span></div>{status.phase === 'unavailable' && <p className="theoria-account-note">Account sync is not configured for this deployment.</p>}{status.phase === 'signed-out' && <SignInPanel />}{status.phase === 'needs-setup' && <SetupPanel />}{status.phase === 'locked' && <UnlockPanel />}{status.phase === 'ready' && <ReadyPanel email={status.email} />}</section>;
}
