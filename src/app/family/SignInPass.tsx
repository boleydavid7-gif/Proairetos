import { useEffect, useState, type FormEvent } from 'react';
import { disableHandoff, enableHandoff, handoffReady, makeSignInPass, signInWithPass } from '../sync/syncController';

/*
 * Signing in the family's other apps from Proairetos, for phones where each Home Screen app keeps its own
 * storage: Proairetos copies a one-time pass; the other app pastes it and is signed in and unlocked.
 */

const message = (error: unknown) => (error instanceof Error ? error.message : 'That did not work. Try again.');

/** In Proairetos's account page, while signed in and unlocked. */
export function SignInAnotherApp() {
  const [ready, setReady] = useState<boolean>();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void handoffReady().then(setReady);
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  if (ready === undefined) return null;

  if (!ready) {
    return (
      <form
        className="stack-tight sign-in-pass"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void run(async () => {
            await enableHandoff(passphrase);
            setPassphrase('');
            setReady(true);
          });
        }}
      >
        <p className="label">Sign in other apps</p>
        <p className="section-description">Enter your passphrase once. Then the other apps can sign in with a pass from here.</p>
        <input
          className="field-input"
          type="password"
          autoComplete="current-password"
          aria-label="Passphrase"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
        />
        <button type="submit" className="chip chip--wide" disabled={!passphrase || busy}>
          Turn on
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <div className="stack-tight sign-in-pass">
      <p className="label">Sign in other apps</p>
      <button
        type="button"
        className="chip chip--wide"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const pass = await makeSignInPass();
            await navigator.clipboard.writeText(pass);
            setNote('Pass copied. In the other app, tap Paste from Proairetos within 2 minutes.');
          })
        }
      >
        {busy ? 'Making a pass…' : 'Copy a sign-in pass'}
      </button>
      {note && <p className="section-description" role="status">{note}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button
        type="button"
        className="text-link"
        onClick={() =>
          void run(async () => {
            await disableHandoff();
            setReady(false);
          })
        }
      >
        Turn off
      </button>
    </div>
  );
}

/** In every other app's account card, while signed out or locked. */
export function PasteFromProairetos({ className = 'button-main' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');

  const use = async (pass: string) => {
    setBusy(true);
    setError('');
    try {
      await signInWithPass(pass);
      // The pass is spent; take it off the clipboard so it is not pasted anywhere else.
      await navigator.clipboard?.writeText('').catch(() => undefined);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field sign-in-pass">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          try {
            // A clipboard that never answers (a prompt left open) falls back to pasting by hand.
            const pasted = await Promise.race([navigator.clipboard.readText(), new Promise<string>((_, reject) => window.setTimeout(() => reject(new Error('slow')), 8000))]);
            if (pasted.includes('proairetos-pass:')) await use(pasted);
            else {
              setError('No pass on the clipboard. Copy one in Proairetos, or paste it here.');
              setTyping(true);
            }
          } catch {
            // Reading the clipboard was refused or is not available here: paste it by hand instead.
            setTyping(true);
          }
        }}
      >
        {busy ? 'Signing in…' : 'Paste from Proairetos'}
      </button>
      {typing && (
        <form
          className="field"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void use(text);
          }}
        >
          <input className="input" aria-label="Sign-in pass" placeholder="Paste the pass here" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={text} onChange={(event) => setText(event.target.value)} />
          <button type="submit" className="button-quiet" disabled={!text.trim() || busy}>
            Sign in
          </button>
        </form>
      )}
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
