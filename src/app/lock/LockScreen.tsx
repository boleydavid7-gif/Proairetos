import { useState } from 'react';
import { lock } from './lock';
import { useNavigate } from '../navigationContext';

/** Stands in for a locked page. Leavable: Today is one tap away. */
export default function LockScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await lock.unlock(code);
    setBusy(false);
    if (!ok) {
      setWrong(true);
      setCode('');
    }
  }

  return (
    <div className="page lock-screen">
      <button type="button" className="back-link" onClick={() => navigate('today')}>
        Today
      </button>
      <h1 className="page-header__title">Locked</h1>
      <form className="settings-card" onSubmit={submit} aria-label="Unlock">
        <p className="section-description">Enter your passcode to open Reflect and Journal.</p>
        <input
          className="field-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          aria-label="Passcode"
          value={code}
          onChange={(event) => {
            setWrong(false);
            setCode(event.target.value.replace(/\D/g, ''));
          }}
        />
        {wrong && <p className="sheet__hint" role="status">That is not the passcode.</p>}
        <button type="submit" className="chip chip--accent chip--wide" disabled={busy || code.length < 4}>
          Unlock
        </button>
        {!forgot ? (
          <button type="button" className="chip" onClick={() => setForgot(true)}>
            Forgot it?
          </button>
        ) : (
          <div>
            <p className="sheet__hint">
              The lock is only for privacy on this device, so it can be taken off. Your writing stays exactly as it is.
            </p>
            <button type="button" className="chip" onClick={() => lock.turnOff()}>
              Remove the lock
            </button>
            <button type="button" className="chip" onClick={() => setForgot(false)}>
              Keep it
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
