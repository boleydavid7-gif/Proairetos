import { useRef, useState, type FormEvent } from 'react';
import { calendarSources, otherCalendars } from '../../app/calendars/otherCalendars';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';

const guides: { name: string; steps: string }[] = [
  {
    name: 'Google Calendar',
    steps:
      'On a computer, open Google Calendar → Settings → choose the calendar under "Settings for my calendars" → Integrate calendar → copy "Secret address in iCal format".',
  },
  {
    name: 'Apple Calendar (iCloud)',
    steps: 'In the Calendar app, tap Calendars → the ⓘ next to a calendar → turn on Public Calendar → Share Link → Copy.',
  },
  {
    name: 'Outlook',
    steps: 'In Outlook on the web: Settings → Calendar → Shared calendars → Publish a calendar → choose "Can view all details" → Publish → copy the ICS link.',
  },
];

function updatedLabel(iso: string | undefined): string {
  if (!iso) return '';
  return `Updated ${new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

/** Bring events in from other calendars: read-only, kept on this device. */
export default function OtherCalendarsSection() {
  const { offerUndo } = useOverlays();
  const sources = useServiceData(otherCalendars.subscribe, async () => calendarSources()) ?? [];
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Check the link and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addLink(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    await run(async () => {
      await otherCalendars.addLink(name, url);
      setName('');
      setUrl('');
    });
  }

  return (
    <>
      <section className="settings-card" aria-label="Your other calendars">
        <p className="section-description">
          See events from Google, Apple, or Outlook alongside your day, on Today and Plan. Read-only: Proairetos never
          changes them. The links and events stay on this device.
        </p>
        {sources.length > 0 && (
          <ul className="other-calendars">
            {sources.map((source) => (
              <li key={source.id} className="other-calendars__row">
                <button
                  type="button"
                  className="toggle-row"
                  aria-pressed={source.shown}
                  onClick={() => otherCalendars.setShown(source.id, !source.shown)}
                >
                  <span className={`toggle-switch${source.shown ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
                  <span className="other-calendars__text">
                    <span>{source.name}</span>
                    <span className="other-calendars__meta">
                      {source.error ? source.error : source.url ? updatedLabel(source.refreshedAt) : 'Imported from a file'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="button-quiet"
                  onClick={() => {
                    const removal = otherCalendars.remove(source.id);
                    offerUndo(`Removed ${source.name}`, removal.undo);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {sources.some((source) => source.url) && (
          <button type="button" className="text-link" disabled={busy} onClick={() => run(() => otherCalendars.refresh(true))}>
            {busy ? 'Refreshing…' : 'Refresh now'}
          </button>
        )}
      </section>

      <section className="settings-card" aria-label="Add a calendar link">
        <h2 className="section-label">Add a calendar link</h2>
        <form className="stack-tight" onSubmit={addLink}>
          <input
            className="field-input"
            aria-label="Calendar name"
            placeholder="A name, e.g. Work or Family"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="field-input"
            aria-label="Calendar link"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="https://… or webcal://… (.ics)"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={busy || !url.trim()}>
            {busy ? 'Reading the calendar…' : 'Add calendar'}
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <details className="calendar-guides">
          <summary>Where to find the link</summary>
          {guides.map((guide) => (
            <div key={guide.name} className="sources">
              <p className="sheet__label">{guide.name}</p>
              <p className="section-description">{guide.steps}</p>
            </div>
          ))}
          <p className="sheet__hint">
            Treat a private link like a password: anyone with it can see that calendar. When you add one, the calendar
            passes through proairetos.com on its way to this device; nothing is kept there.
          </p>
        </details>
      </section>

      <section className="settings-card" aria-label="Import a calendar file">
        <h2 className="section-label">Or import a file</h2>
        <p className="section-description">A one-time copy from an .ics file. It does not update by itself.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".ics,text/calendar"
          className="visually-hidden"
          aria-label="Calendar file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void run(async () => otherCalendars.addFile(file.name.replace(/\.ics$/i, ''), await file.text()));
            event.target.value = '';
          }}
        />
        <button type="button" className="chip chip--wide" disabled={busy} onClick={() => fileInput.current?.click()}>
          Choose a calendar file
        </button>
      </section>
    </>
  );
}
