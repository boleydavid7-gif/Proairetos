import { useState, type FormEvent } from 'react';
import { askForPasskey, passkeysHere } from '../../data/sync/passkeys';
import { security } from './securityService';
import { useSecurity } from './useSecurity';

// Self-contained styling, like the error page: every app in the family shows this and not all share one stylesheet.
const page = { display: 'grid', gap: 16, maxWidth: '26rem', margin: '16vh auto 0', padding: '0 24px', color: 'inherit' } as const;
const field = { minHeight: 48, padding: '0 14px', borderRadius: 12, border: '1px solid currentColor', background: 'transparent', color: 'inherit', font: 'inherit' } as const;
const button = { minHeight: 48, padding: '0 20px', borderRadius: 999, font: 'inherit', cursor: 'pointer' } as const;
const primary = { ...button, border: 0, background: '#c9a274', color: '#14110d', fontWeight: 600 } as const;
const quiet = { ...button, border: '1px solid currentColor', background: 'transparent', color: 'inherit' } as const;

const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'That did not open. Try again.');

/** What every app shows while the vault is locked: the same unlock, with what the person already has. */
export default function LockedScreen() {
  const status = useSecurity();
  const [recovery, setRecovery] = useState(false);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
      setSecret('');
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => (recovery ? security.unlockWithRecoveryKey(secret) : security.unlockWithPassphrase(secret)));
  };

  const openWithPasskey = () =>
    run(async () => {
      const used = await askForPasskey({ allow: status.passkeys });
      if (!used.secret) throw new Error('This passkey cannot open your data on this device. Use your account password or recovery key.');
      await security.unlockWithPasskey(used.credentialId, used.secret);
    });

  return (
    <main className="locked-screen" style={page}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif, var(--serif, Georgia, serif))', fontWeight: 500 }}>Locked</h1>
      {status.passkeys.length > 0 && passkeysHere() && (
        <button type="button" style={primary} disabled={busy} onClick={() => void openWithPasskey()}>
          Open with a passkey
        </button>
      )}
      <form style={{ display: 'grid', gap: 12 }} onSubmit={submit}>
        <input
          type="password"
          style={field}
          aria-label={recovery ? 'Recovery key' : 'Account password'}
          autoComplete={recovery ? 'off' : 'current-password'}
          spellCheck={false}
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
        <button type="submit" style={status.passkeys.length > 0 ? quiet : primary} disabled={busy || secret.length === 0}>
          {busy ? 'Opening…' : 'Unlock'}
        </button>
      </form>
      <button
        type="button"
        style={{ ...quiet, border: 0, justifySelf: 'start', padding: 0, minHeight: 44, textDecoration: 'underline' }}
        onClick={() => {
          setRecovery(!recovery);
          setSecret('');
          setError('');
        }}
      >
        {recovery ? 'Use account password' : 'Use recovery key'}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
    </main>
  );
}
