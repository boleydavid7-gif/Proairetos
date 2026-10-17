import { useEffect, useState } from 'react';
import type { StorageProvider } from '../../data/sync/storageProviders';
import {
  connectReturn,
  connectStorage,
  finishStorageConnect,
  moveToProairetos,
  storageName,
  storageNow,
  storageProvidersHere,
  type StorageTarget,
} from '../../app/sync/syncController';

const message = (error: unknown) => (error instanceof Error ? error.message : 'That did not work. Try again.');

/**
 * Where the data syncs, in Proairetos's account page: Proairetos's server, or the person's own Google Drive, Dropbox
 * or OneDrive. Shown only when the site has at least one of them set up.
 */
export function StorageChoice() {
  const [providers, setProviders] = useState<StorageProvider[]>([]);
  const [now, setNow] = useState<StorageTarget>();
  const [picked, setPicked] = useState<StorageTarget>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

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
      setNow(await storageNow().catch(() => undefined));
    }
  };

  useEffect(() => {
    void storageProvidersHere().then((found) => setProviders(Object.keys(found) as StorageProvider[]));
    void storageNow().then(setNow, () => undefined);
    // Back from the provider's page.
    const back = connectReturn();
    if (back)
      void run(async () => {
        const provider = await finishStorageConnect(back);
        setNote(`Your data now syncs through ${storageName(provider)}. The copy on Proairetos's server was removed.`);
      });
  }, []);

  if (providers.length === 0 && !busy && !error) return null;
  const choices: StorageTarget[] = ['proairetos', ...providers];

  return (
    <div className="stack-tight storage-choice">
      <p className="label">Where your data syncs</p>
      <ul className="passkeys__list" role="radiogroup" aria-label="Where your data syncs">
        {choices.map((choice) => (
          <li key={choice} className="passkeys__row">
            <button
              type="button"
              role="radio"
              aria-checked={(picked ?? now) === choice}
              className="storage-choice__row"
              disabled={busy}
              onClick={() => setPicked(choice)}
            >
              <span>
                {choice === 'proairetos' ? 'Proairetos' : storageName(choice)}
                <span className="passkeys__detail">{now === choice ? 'Now' : choice === 'proairetos' ? 'Our server' : 'Your own storage'}</span>
              </span>
              <span className="storage-choice__mark" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {picked && picked !== now && (
        <>
          <p className="section-description">
            {picked === 'proairetos'
              ? `Your data moves back to Proairetos's server. The files in ${now ? storageName(now) : 'your storage'} stay there until you remove them.`
              : `Proairetos asks for its own folder in your ${storageName(picked)}. Your data moves there, locked on this device first; the copy on Proairetos's server is removed. Every app and device follows.`}
          </p>
          <div className="chip-row">
            <button type="button" className="button-quiet" onClick={() => setPicked(undefined)}>
              Cancel
            </button>
            <button
              type="button"
              className="chip chip--accent"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (picked === 'proairetos') {
                    await moveToProairetos();
                    setNote("Your data now syncs through Proairetos's server.");
                  } else await connectStorage(picked);
                  setPicked(undefined);
                })
              }
            >
              {busy ? 'Moving…' : picked === 'proairetos' ? 'Move back' : `Connect ${storageName(picked)}`}
            </button>
          </div>
        </>
      )}
      {now && now !== 'proairetos' && !picked && !busy && (
        // A provider can stop accepting the connection (a changed password, or OneDrive after a day unused).
        <button type="button" className="text-link" onClick={() => void run(() => connectStorage(now))}>
          Connect {storageName(now)} again
        </button>
      )}
      {busy && !picked && <p className="section-description">Moving your data…</p>}
      {note && (
        <p className="section-description" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
