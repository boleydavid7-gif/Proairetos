import { useContext, useEffect, useState, type FormEvent } from 'react';
import { OverlayContext } from '../../app/overlays/OverlayContext';
import { MakePasskeyNow, usePasskeyStep } from '../../app/family/Passkey';
import {
  addPasskey,
  forgetPreparedPasskey,
  letPasskeyOpen,
  listPasskeys,
  passkeyReady,
  passkeyWaiting,
  passkeysAvailable,
  preparePasskey,
  removePasskey,
  restorePasskey,
  type PasskeyEntry,
} from '../../app/sync/syncController';
import { Waiting } from '../../lamplight/Waiting';

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

/**
 * Passkeys, in Proairetos's account page: Face ID, a fingerprint or the device's PIN signs in and opens the data in
 * every app. Added with the passphrase once (or none, where this device keeps the copy for sign-in passes).
 */
export function Passkeys() {
  // Askesis and Soma reuse the account settings panel but do not mount
  // Proairetos's overlay provider. Passkey management still works there;
  // only the Proairetos undo toast is unavailable.
  const overlays = useContext(OverlayContext);
  const [entries, setEntries] = useState<PasskeyEntry[]>();
  const [problem, setProblem] = useState('');
  const [oneTap, setOneTap] = useState(false);
  const [asking, setAsking] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [round, setRound] = useState(0);
  // A passkey that only signs in, being given what opens the data.
  const [finishing, setFinishing] = useState<PasskeyEntry>();
  const [finishNote, setFinishNote] = useState('');
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
                  {!entry.opens && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setFinishNote('');
                        setFinishing(entry);
                        if (!oneTap) setAsking(true);
                      }}
                    >
                      Let it open your data
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      void run(async () => {
                        await removePasskey(entry.id);
                        setEntries((all) => all?.filter((each) => each.id !== entry.id));
                        overlays?.offerUndo(`Passkey “${entry.label}” removed`, async () => {
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
          {finishing && !asking && (
            <div className="chip-row">
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  forgetPreparedPasskey();
                  setFinishing(undefined);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chip chip--accent"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const opens = await letPasskeyOpen(finishing.id);
                    setFinishing(undefined);
                    setFinishNote(
                      opens
                        ? 'This passkey now opens your data in every app.'
                        : 'This device’s passkey cannot open your data. That needs iOS 18 or later (or recent Android) and a passkey saved in Passwords or Google Password Manager. It still signs in.',
                    );
                    await load();
                  })
                }
              >
                {busy ? 'Asking…' : `Use the passkey (${finishing.label})`}
              </button>
            </div>
          )}
          {finishNote && (
            <p className="section-description" role="status">
              {finishNote}
            </p>
          )}
          {!finishing && <MakePasskeyNow key={round} className="chip chip--accent chip--wide" quietClass="text-link" errorClass="form-error" noteClass="section-description" onDone={() => void load()} />}
          {finishing || passkeyWaiting() ? null : oneTap ? (
            <button
              type="button"
              className="chip chip--wide"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const added = await addPasskey((entries ?? []).map((each) => each.id));
                  const found = await listPasskeys();
                  setEntries(found);
                  // The new passkey gives its secret only when used: the next tap asks for it.
                  const fresh = added.finish ? found.find((each) => each.id === added.finish) : undefined;
                  if (fresh) setFinishing(fresh);
                  else setRound((n) => n + 1);
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
                  // The next tap makes the passkey, or asks the one being finished (Safari needs it straight after a tap).
                  if (!finishing) setRound((n) => n + 1);
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
                <button type="button" className="button-quiet" onClick={() => (setAsking(false), setPassphrase(''), setFinishing(undefined))}>
                  Cancel
                </button>
                <button type="submit" className="chip chip--accent" disabled={!passphrase || busy}>
                  {busy ? <Waiting>Checking…</Waiting> : 'Continue'}
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
