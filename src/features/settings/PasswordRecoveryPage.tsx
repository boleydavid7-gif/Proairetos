import { useEffect, useState, type FormEvent } from 'react';
import { setAccountPassword, supabase } from '../../data/sync/supabase';
import {
  clearPasswordRecoveryPending,
} from '../../app/sync/syncController';

type Stage = 'checking' | 'password' | 'done' | 'error';

const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'Something went wrong. Try again.');

export default function PasswordRecoveryPage() {
  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    void supabase()
      .then((client) => {
        const read = async () => {
          const { data } = await client.auth.getSession();
          if (!alive) return;
          if (data.session) {
            setEmail(data.session.user.email ?? '');
            setStage('password');
          } else {
            setError('This password reset link has expired. Request a new one from the sign-in screen.');
            setStage('error');
          }
        };
        void read();
        const result = client.auth.onAuthStateChange((event, session) => {
          if (!alive || !session || (event !== 'PASSWORD_RECOVERY' && event !== 'SIGNED_IN')) return;
          setEmail(session.user.email ?? '');
          setStage('password');
          setError('');
        });
        unsubscribe = () => result.data.subscription.unsubscribe();
      })
      .catch((cause) => {
        if (!alive) return;
        setError(message(cause));
        setStage('error');
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const continueToAccount = () => {
    clearPasswordRecoveryPending();
    window.location.assign('/?open=account');
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (password.length < 10) throw new Error('Use at least 10 characters for your password.');
      if (password !== again) throw new Error('The passwords do not match.');
      await setAccountPassword(password);
      setPassword('');
      setAgain('');
      setStage('done');
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="password-recovery page">
      <div className="password-recovery__brand">Proairetos</div>
      <section className="settings-card password-recovery__card" aria-labelledby="password-recovery-title">
        {stage === 'checking' && <p className="section-description">Opening your secure password reset…</p>}
        {stage === 'password' && (
          <>
            <h1 id="password-recovery-title" className="page-header__title">Choose a new password</h1>
            {email && <p className="section-description">For {email}</p>}
            <form className="stack-tight" onSubmit={(event) => void savePassword(event)}>
              <input className="field-input" type="password" autoComplete="new-password" aria-label="New password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <input className="field-input" type="password" autoComplete="new-password" aria-label="Confirm new password" placeholder="Confirm new password" value={again} onChange={(event) => setAgain(event.target.value)} />
              <button type="submit" className="button-accent" disabled={busy || password.length < 10 || password !== again}>{busy ? 'Saving…' : 'Save new password'}</button>
            </form>
          </>
        )}
        {stage === 'done' && (
          <>
            <h1 id="password-recovery-title" className="page-header__title">Password changed</h1>
            <p className="section-description">Your new password is ready for {email || 'your Proairetos account'}.</p>
            <p className="section-description">If this device asks for a recovery key when you open your data, enter it once to reconnect the new password.</p>
            <button type="button" className="button-accent" onClick={continueToAccount}>Continue to Proairetos</button>
          </>
        )}
        {stage === 'error' && (
          <>
            <h1 id="password-recovery-title" className="page-header__title">Reset link unavailable</h1>
            <p className="form-error" role="alert">{error}</p>
            <button type="button" className="button-accent" onClick={() => window.location.assign('/?open=account')}>Return to sign in</button>
          </>
        )}
        {error && stage !== 'error' && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
