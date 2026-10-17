import { useState } from 'react';
import { CAPTURE_ADDRESS, inboxHere, turnOffInbox, turnOnInbox } from '../../app/capture/inbox';
import { useSyncStatus } from './AccountSection';

const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'That did not work. Try again.');

function Copy({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="inbox-copy">
      <span className="sheet__label">{label}</span>
      <code className="inbox-copy__value">{value}</code>
      <button type="button" className="chip" onClick={() => void navigator.clipboard?.writeText(value).then(() => setCopied(true))}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * Settings > Capture from anywhere: a Shortcut (Siri, Back Tap, Apple Watch) sends words straight into Capture without
 * opening the app. Sealed on arrival with a key made here; opened here.
 */
export default function InboxSection({ onOpenAccount }: { onOpenAccount: () => void }) {
  const status = useSyncStatus();
  const [kept, setKept] = useState(inboxHere);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  if (status.phase !== 'ready') {
    return (
      <section className="settings-card">
        <p className="section-description">Sign in and open your data first.</p>
        <button type="button" className="button-accent account-wide" onClick={onOpenAccount}>
          Account and sync
        </button>
      </section>
    );
  }

  if (!kept) {
    return (
      <section className="settings-card">
        <p className="section-description">Say “Hey Siri, Capture”, double-tap the back of your iPhone, or tap your watch, and the words land in Capture without opening the app. They are locked on arrival with a key only this device holds.</p>
        <button type="button" className="button-accent account-wide" disabled={busy} onClick={() => void run(async () => setKept(await turnOnInbox()))}>
          {busy ? 'Setting up…' : 'Turn on'}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <div className="settings-sections">
      <section className="settings-group" aria-label="Make the Shortcut">
        <h2 className="settings-group__label">Make the Shortcut (iPhone)</h2>
        <div className="settings-card">
          <ol className="inbox-steps">
            <li>Open Shortcuts, tap +, and add <strong>Ask for Input</strong> (Text).</li>
            <li>
              Add <strong>Get Contents of URL</strong> with the address below. Under Show More: Method <strong>POST</strong>, Request Body{' '}
              <strong>JSON</strong>, a Text field <code>token</code> with the token below, and a Text field <code>text</code> set to Provided Input.
            </li>
            <li>Name it <strong>Capture</strong>. Siri now answers to “Hey Siri, Capture”.</li>
            <li>Optional: Settings › Accessibility › Touch › Back Tap › Double Tap › Capture.</li>
          </ol>
          <Copy label="Address" value={CAPTURE_ADDRESS} />
          <Copy label="Token" value={kept.token} />
          <p className="sheet__hint">Anyone with the token can add to your Capture, though not read it. Make a new one if it gets out.</p>
        </div>
      </section>
      <section className="settings-group" aria-label="Inbox">
        <div className="settings-card">
          <p className="section-description">What arrives shows in Capture when Proairetos opens on this device.</p>
          <button type="button" className="chip account-wide" disabled={busy} onClick={() => void run(async () => setKept(await turnOnInbox()))}>
            Make a new token
          </button>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await turnOffInbox();
                setKept(undefined);
              })
            }
          >
            Turn off
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  );
}
