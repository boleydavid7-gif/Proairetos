import { useEffect, useState, type FormEvent } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { MakePasskeyNow, usePasskeyStep } from '../../app/family/Passkey';
import {
  addPasskey,
  listPasskeys,
  passkeyReady,
  passkeyWaiting,
  passkeysAvailable,
  preparePasskey,
  removePasskey,
  restorePasskey,
  type PasskeyEntry,
} from '../../app/sync/syncController';

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

/**
 * Passkeys, in Proairetos's account page: Face ID, a fingerprint or the device's PIN signs in and opens the data in
 * every app. Added with the passphrase once (or none, where this device keeps the copy for sign-in passes).
 */
export function Passkeys() {
  const { offerUndo } = useOverlays();
  const [entries, setEntries] = useState<PasskeyEntry[]>();
  const [problem, setProblem] = useState('');
  const [oneTap, setOneTap] = useState(false);
  const [asking, setAsking] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [round, setRound] = useState(0);
  const { busy, error, run } = usePasskeyStep();

  const load = () =>
    listPasskeys().then(
      (found) => (setEntries(found), setProblem('')),
      (cause: unknown) => setProblem(cause instanceof Error ? cause.message : 'Passkeys could not be read.'),
    );

  useEffect(() => {
    if (!passkeysAvailable()) return;
    void load();
    void passkeyReady().then(setOneTap);
  }, [round]);

  if (!passkeysAvailable()) return null;

  return (
    <div className="stack-tight passkeys">
      <p className="label">Passkeys</p>
      {problem ? (
        <p className="section-description">{problem}</p>
      ) : (
        <>
          <p className="section-description">Face ID, a fingerprint or the device's PIN signs in and opens your data, in every app.</p>
          {entries && entries.length > 0 && (
            <ul className="passkeys__list">
              {entries.map((entry) => (
                <li key={entry.id} className="passkeys__row">
                  <span>
                    {entry.label}
                    <span className="passkeys__detail">
                      {[`Added ${day(entry.addedAt)}`, entry.usedAt ? `used ${day(entry.usedAt)}` : '', entry.opens ? '' : 'signs in only'].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      void run(async () => {
                        await removePasskey(entry.id);
                        setEntries((all) => all?.filter((each) => each.id !== entry.id));
                        offerUndo(`Passkey removed: ${entry.label}`, async () => {
                          await restorePasskey(entry.row);
                          await load();
                        });
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <MakePasskeyNow key={round} className="chip chip--accent chip--wide" quietClass="text-link" errorClass="form-error" noteClass="section-description" onDone={() => void load()} />
          {passkeyWaiting() ? null : oneTap ? (
            <button
              type="button"
              className="chip chip--wide"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await addPasskey((entries ?? []).map((each) => each.id));
                  setRound((n) => n + 1);
                })
              }
            >
              {busy ? 'Adding…' : 'Add a passkey'}
            </button>
          ) : asking ? (
            <form
              className="stack-tight"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void run(async () => {
                  await preparePasskey(passphrase);
                  setPassphrase('');
                  setAsking(false);
                  // The next tap makes the passkey (Safari needs it straight after a tap).
                  setRound((n) => n + 1);
                });
              }}
            >
              <input
                className="field-input"
                type="password"
                autoComplete="current-password"
                aria-label="Passphrase"
                placeholder="Your passphrase"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <div className="chip-row">
                <button type="button" className="button-quiet" onClick={() => (setAsking(false), setPassphrase(''))}>
                  Cancel
                </button>
                <button type="submit" className="chip chip--accent" disabled={!passphrase || busy}>
                  {busy ? 'Checking…' : 'Continue'}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="chip chip--wide" onClick={() => setAsking(true)}>
              Add a passkey
            </button>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
