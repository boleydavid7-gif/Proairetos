import { useEffect, useState } from 'react';
import { downloadCalendarFile } from '../../app/sync/calendarFile';
import {
  calendarFeedLink,
  disableCalendarFeed,
  enableCalendarFeed,
  refreshCalendarFeed,
  renewCalendarFeedLink,
} from '../../app/sync/syncController';
import { loadCalendarFeed, saveCalendarFeed, type StoredFeedOptions } from '../../data/storage/preferences';
import { useSyncStatus } from './AccountSection';

const choices: { key: keyof StoredFeedOptions; label: string; hint?: string }[] = [
  { key: 'shifts', label: 'Commitments from my schedule' },
  { key: 'shiftLabels', label: 'Use the names from my schedule', hint: 'Instead of a plain "Busy", e.g. "Class" or "Nights".' },
  { key: 'protectedTime', label: 'Protected time' },
  { key: 'tasks', label: 'Things with a day or time', hint: 'Includes their titles, so anyone with the link can read them.' },
];

const webcal = (url: string) => url.replace(/^https:/, 'webcal:');

/** Subscribe links for each calendar, from the feed's https address. */
export function subscribeLinks(url: string) {
  return {
    apple: webcal(url),
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal(url))}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=Proairetos`,
  };
}

export default function CalendarSection({ onOpenAccount }: { onOpenAccount: () => void }) {
  const status = useSyncStatus();
  const [feed, setFeed] = useState(loadCalendarFeed);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const ready = status.phase === 'ready';

  useEffect(() => {
    if (ready) void calendarFeedLink().then(setLink).catch(() => undefined);
  }, [ready]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not finish. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: keyof StoredFeedOptions) {
    const next = { ...feed, options: { ...feed.options, [key]: !feed.options[key] } };
    setFeed(next);
    saveCalendarFeed(next);
    if (next.enabled) void run(refreshCalendarFeed);
  }

  const links = link ? subscribeLinks(link) : null;

  return (
    <>
      <section className="settings-card" aria-label="What goes in your calendar">
        <p className="section-description">
          Puts your schedule and Oikonomia bills into Apple, Google, or Microsoft calendars. Choose what else to include:
        </p>
        {choices.map(({ key, label, hint }) => (
          <div key={key}>
            <button type="button" className="toggle-row" aria-pressed={feed.options[key]} onClick={() => toggle(key)}>
              <span className={`toggle-switch${feed.options[key] ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
            {hint && <p className="sheet__hint calendar-hint">{hint}</p>}
          </div>
        ))}
      </section>

      <section className="settings-card" aria-label="Subscription link">
        <h2 className="section-label">Subscription link</h2>
        <p className="section-description">
          Your calendar checks this link and updates on its own (Google can take several hours). Unlike the rest of
          Proairetos, the calendar file is not encrypted: the server and anyone with the link can read what you chose
          above.
        </p>

        {!ready ? (
          <>
            <p className="sheet__hint">The link needs sync turned on.</p>
            <button type="button" className="chip chip--wide" onClick={onOpenAccount}>
              Account and sync
            </button>
          </>
        ) : feed.enabled && links ? (
          <>
            <div className="calendar-link">
              <input className="field-input" readOnly aria-label="Calendar link" value={link!} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="button-accent"
                onClick={async () => {
                  await navigator.clipboard?.writeText(link!).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="calendar-buttons">
              <a className="chip" href={links.apple}>
                Apple Calendar
              </a>
              <a className="chip" href={links.google} target="_blank" rel="noreferrer">
                Google Calendar
              </a>
              <a className="chip" href={links.outlook} target="_blank" rel="noreferrer">
                Outlook
              </a>
            </div>
            <p className="sheet__hint">
              On iPhone, Apple Calendar asks to subscribe. For Google on a phone, open the Google link in a browser; the
              calendar then appears in the Google Calendar app.
            </p>
            {confirmingOff ? (
              <div className="chip-row">
                <button type="button" className="button-quiet" onClick={() => setConfirmingOff(false)}>
                  Keep it
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await disableCalendarFeed();
                      setFeed(loadCalendarFeed());
                      setLink(null);
                      setConfirmingOff(false);
                    })
                  }
                >
                  Turn off and delete the file
                </button>
              </div>
            ) : (
              <div className="chip-row">
                <button type="button" className="chip" disabled={busy} onClick={() => run(async () => setLink(await renewCalendarFeedLink()))}>
                  Make a new link
                </button>
                <button type="button" className="button-quiet" onClick={() => setConfirmingOff(true)}>
                  Turn off
                </button>
              </div>
            )}
            {confirmingOff && (
              <p className="sheet__hint">Calendars subscribed to it stop updating. You can make a new link any time.</p>
            )}
          </>
        ) : (
          <button
            type="button"
            className="chip chip--accent chip--wide"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const url = await enableCalendarFeed(feed.options);
                setFeed(loadCalendarFeed());
                setLink(url);
              })
            }
          >
            {busy ? 'Creating…' : 'Create link'}
          </button>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="settings-card" aria-label="Download instead">
        <h2 className="section-label">Or download a file</h2>
        <p className="section-description">
          A one-time copy for any calendar to import. Nothing goes through the server; download again after changes.
        </p>
        <button type="button" className="chip chip--wide" onClick={() => run(() => downloadCalendarFile(feed.options))}>
          Download calendar file
        </button>
      </section>
    </>
  );
}
