import { useEffect, useState, useSyncExternalStore } from 'react';
import { notifications } from '../../app/notify/notifications';
import { disableReminders, enableReminders, refreshReminders } from '../../app/sync/syncController';
import { privateNotice, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { loadQuietHours, saveQuietHours } from '../../data/storage/preferences';
import { useSyncStatus } from './AccountSection';

const calendarLeads = [0, 5, 10, 15, 30] as const;
const scheduleLeads = [15, 30, 60] as const;

const time = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function when(date: Date): string {
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today.getTime() + 86_400_000).toDateString() === date.toDateString();
  const day = sameDay
    ? 'Today'
    : tomorrow
      ? 'Tomorrow'
      : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${time(date)}`;
}

function leadLabel(minutes: number): string {
  return minutes === 0 ? 'At the start' : minutes === 60 ? '1 hour' : `${minutes} min`;
}

function Switch({
  on,
  label,
  detail,
  onToggle,
}: {
  on: boolean;
  label: string;
  detail?: string;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="toggle-row" role="switch" aria-checked={on} aria-pressed={on} onClick={onToggle}>
      <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
      <span className="toggle-row__text">
        <span>{label}</span>
        {detail && <span className="toggle-row__detail">{detail}</span>}
      </span>
    </button>
  );
}

/** How one will look on the phone: the next real one, or an example. */
function Preview({ notice, details }: { notice: Notice | undefined; details: boolean }) {
  const sample: Notice = notice ?? {
    key: 'sample',
    kind: 'item',
    at: new Date(),
    title: 'Dentist',
    body: 'In 15 minutes · 4:00 PM · Main Street',
    open: 'today',
  };
  const shown = details ? sample : privateNotice(sample, time);
  return (
    <figure className="notice-preview" aria-label="How a notification looks">
      <div className="notice-preview__card">
        <img className="notice-preview__icon" src="/icons/icon-192.png" alt="" />
        <div className="notice-preview__text">
          <p className="notice-preview__app">
            <span>Proairetos</span>
            <span>{notice ? time(notice.at) : 'now'}</span>
          </p>
          <p className="notice-preview__title">{shown.title}</p>
          <p className="notice-preview__body">{shown.body}</p>
        </div>
      </div>
      <figcaption className="sheet__hint">
        {notice ? 'Your next one, as it will look.' : 'An example of how one looks.'}
      </figcaption>
    </figure>
  );
}

/** When notifications wait. A held one arrives as soon as the quiet ends. */
function QuietHours() {
  const [quiet, setQuiet] = useState(loadQuietHours);
  const update = (next: typeof quiet) => {
    setQuiet(next);
    saveQuietHours(next);
    notifications.refreshSoon();
    void refreshReminders();
  };
  return (
    <div className="quiet-hours">
      <Switch on={quiet.on} label="Quiet hours" onToggle={() => update({ ...quiet, on: !quiet.on })} />
      {quiet.on && (
        <div className="field-row">
          <input
            type="time"
            className="field-input"
            aria-label="Quiet from"
            value={quiet.start}
            onChange={(event) => event.target.value && update({ ...quiet, start: event.target.value })}
          />
          <span className="sheet__hint">to</span>
          <input
            type="time"
            className="field-input"
            aria-label="Quiet until"
            value={quiet.end}
            onChange={(event) => event.target.value && update({ ...quiet, end: event.target.value })}
          />
        </div>
      )}
      <Switch
        on={quiet.duringProtected}
        label="Also during protected time"
        detail="Time you set aside in your schedule or a calendar."
        onToggle={() => update({ ...quiet, duringProtected: !quiet.duringProtected })}
      />
      <p className="sheet__hint">One that falls in quiet time arrives when it ends. None are dropped.</p>
    </div>
  );
}

/**
 * Settings > Notifications: what notifies, how it reads, and when it waits.
 * Every notice is written on this device; only its time ever leaves it.
 */
export default function NotificationsSection() {
  useSyncExternalStore(notifications.subscribe, notifications.next);
  const sync = useSyncStatus();
  const [settings, setSettings] = useState(notifications.settings);
  const [error, setError] = useState('');
  const permission = notifications.permission();
  const upcoming = notifications.next();
  const update = (next: Partial<NoticeSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    notifications.setSettings(merged);
  };
  useEffect(() => {
    void notifications.refresh();
  }, []);

  const isInstalled =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <section className="settings-card notify-settings" aria-label="Notifications">
      <Preview notice={upcoming[0]} details={settings.details} />

      {permission === 'unsupported' &&
        (isIos && !isInstalled ? (
          <p className="sheet__hint">
            On iPhone, add Proairetos to your Home Screen first (Share, then Add to Home Screen), and open it from
            there.
          </p>
        ) : (
          <p className="sheet__hint">This browser cannot show notifications.</p>
        ))}
      {permission === 'denied' && (
        <p className="sheet__hint">
          Notifications are turned off for Proairetos in your phone’s settings. You can allow them there.
        </p>
      )}
      {permission === 'default' && (
        <button type="button" className="button-accent" onClick={() => void notifications.ask()}>
          Allow notifications
        </button>
      )}
      {permission === 'granted' && (
        <button type="button" className="chip chip--wide" onClick={() => void notifications.test()}>
          Show one now
        </button>
      )}

      {permission === 'granted' && (
        <div className="settings-sub">
          <p className="sheet__label">When Proairetos is closed</p>
          {sync.phase === 'ready' ? (
            <>
              <Switch
                on={sync.reminders === 'on'}
                label="Also when the app is closed"
                detail="The server learns only the times. The words are written on this phone when one arrives."
                onToggle={() =>
                  sync.reminders === 'on'
                    ? void disableReminders()
                    : void enableReminders().catch((cause) =>
                        setError(cause instanceof Error ? cause.message : 'That did not work just now.'),
                      )
                }
              />
              {error && <p className="form-error">{error}</p>}
            </>
          ) : (
            <p className="sheet__hint">
              For now they arrive while Proairetos is open or in the background. With sync on (Settings, Account and
              sync), they arrive any time, even with the app closed.
            </p>
          )}
        </div>
      )}

      <div className="settings-sub">
        <p className="sheet__label">What to tell you about</p>
        <Switch
          on={settings.items}
          label="Things with a time"
          detail="At the time, unless you choose otherwise on the thing itself."
          onToggle={() => update({ items: !settings.items })}
        />
        <Switch
          on={settings.calendars}
          label="Other calendars"
          detail="Events with a time from calendars you added."
          onToggle={() => update({ calendars: !settings.calendars })}
        />
        {settings.calendars && (
          <div className="chip-row notify-leads" role="group" aria-label="Before calendar events">
            {calendarLeads.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="chip chip--small"
                aria-pressed={settings.calendarLead === minutes}
                onClick={() => update({ calendarLead: minutes })}
              >
                {leadLabel(minutes)}
              </button>
            ))}
          </div>
        )}
        <Switch
          on={settings.schedule}
          label="Your schedule"
          detail="Before a block starts: work, study, care, or time you protect."
          onToggle={() => update({ schedule: !settings.schedule })}
        />
        {settings.schedule && (
          <div className="chip-row notify-leads" role="group" aria-label="Before a block starts">
            {scheduleLeads.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="chip chip--small"
                aria-pressed={settings.scheduleLead === minutes}
                onClick={() => update({ scheduleLead: minutes })}
              >
                {leadLabel(minutes)}
              </button>
            ))}
          </div>
        )}
        <Switch
          on={settings.checkBacks}
          label="Check-back days"
          detail="At 9:00 on the day you chose to check back."
          onToggle={() => update({ checkBacks: !settings.checkBacks })}
        />
        <Switch
          on={settings.lookBacks}
          label="Decisions to look back on"
          detail="At 9:00 on the day you chose."
          onToggle={() => update({ lookBacks: !settings.lookBacks })}
        />
        <Switch
          on={settings.day}
          label="A look at your day"
          detail="What has a time today, in one line."
          onToggle={() => update({ day: !settings.day })}
        />
        {settings.day && (
          <label className="block-fields__time notify-day-at">
            <span>At</span>
            <input
              type="time"
              className="field-input"
              aria-label="A look at your day, at"
              value={settings.dayAt}
              onChange={(event) => event.target.value && update({ dayAt: event.target.value })}
            />
          </label>
        )}
      </div>

      <div className="settings-sub">
        <p className="sheet__label">On the lock screen</p>
        <Switch
          on={settings.details}
          label="Show what it is"
          detail={settings.details ? 'The title and time show.' : 'Only “Something you chose” and the time show.'}
          onToggle={() => update({ details: !settings.details })}
        />
      </div>

      <div className="settings-sub">
        <p className="sheet__label">Quiet</p>
        <QuietHours />
      </div>

      <div className="settings-sub">
        <p className="sheet__label">Coming up</p>
        {upcoming.length === 0 ? (
          <p className="sheet__hint">Nothing in the next two weeks.</p>
        ) : (
          <ul className="notify-upcoming">
            {upcoming.slice(0, 6).map((notice) => (
              <li key={notice.key}>
                <span className="notify-upcoming__when">{when(notice.at)}</span>
                <span className="notify-upcoming__title">{notice.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
