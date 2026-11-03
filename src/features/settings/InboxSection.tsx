import { useState, type ReactNode } from 'react';
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

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="inbox-step">
      <span className="inbox-step__number" aria-hidden="true">{number}</span>
      <div className="inbox-step__content">
        <h3 className="inbox-step__title">{title}</h3>
        <div className="inbox-step__body">{children}</div>
      </div>
    </li>
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
        <h2 className="settings-group__label">Set up on iPhone</h2>
        <div className="settings-card">
          <p className="inbox-intro">Make a Shortcut once. Then send a thought to Proairetos without opening the app.</p>
          <ol className="inbox-steps">
            <Step number={1} title="Ask for the text">
              <p>Open <strong>Shortcuts</strong>, tap <strong>+</strong>, and add <strong>Ask for Input</strong>. Set the input type to <strong>Text</strong>.</p>
            </Step>
            <Step number={2} title="Send it to Proairetos">
              <p>Add <strong>Get Contents of URL</strong> and paste the address below. Tap <strong>Show More</strong>, then set:</p>
              <ul>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Request Body:</strong> JSON</li>
              </ul>
              <p>Add these two fields to the JSON body:</p>
              <div className="inbox-fields">
                <div className="inbox-field"><code>token</code><span>Text · paste the token below</span></div>
                <div className="inbox-field"><code>text</code><span>Text · choose <strong>Provided Input</strong></span></div>
              </div>
            </Step>
            <Step number={3} title="Name it Capture">
              <p>Tap the shortcut name at the top, rename it <strong>Capture</strong>, and tap <strong>Done</strong>.</p>
              <p>Now you can say, “Hey Siri, Capture.”</p>
            </Step>
            <Step number={4} title="Use Back Tap (optional)">
              <p>On your iPhone, go to <strong>Settings → Accessibility → Touch → Back Tap → Double Tap</strong>, then choose <strong>Capture</strong>.</p>
            </Step>
          </ol>
          <div className="inbox-values">
            <Copy label="Address" value={CAPTURE_ADDRESS} />
            <Copy label="Token" value={kept.token} />
          </div>
          <p className="sheet__hint inbox-security-note">Keep your token private. Anyone with it can send items to your Capture, but they can’t read your data. If it gets out, make a new token.</p>
          <p className="inbox-result">When you run the Shortcut, your note appears in Capture the next time you open Proairetos.</p>
        </div>
      </section>
      <section className="settings-group" aria-label="Inbox">
        <div className="settings-card">
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
