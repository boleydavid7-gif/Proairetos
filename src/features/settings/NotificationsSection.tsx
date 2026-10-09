import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { notifications } from '../../app/notify/notifications';
import { disableReminders, enableReminders, refreshReminders } from '../../app/sync/syncController';
import { noticeLeadChoices, noticeLeadLabel, type NoticeSettings } from '../../core/notify/notices';
import { loadQuietHours, saveQuietHours } from '../../data/storage/preferences';
import { useSyncStatus } from './AccountSection';

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

/** One line: a switch, and beside it, while on, the one choice that goes with it. */
function Switch({
  on,
  label,
  onToggle,
  below,
  children,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  /** The choice goes on its own line, under the switch. */
  below?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="notify-row">
      <button type="button" className="toggle-row" role="switch" aria-checked={on} aria-pressed={on} onClick={onToggle}>
        <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">{label}</span>
      </button>
      {on && children && (
        <span className={`notify-row__choice${below ? ' notify-row__choice--below' : ''}`}>{children}</span>
      )}
    </div>
  );
}

function Lead({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: number;
  choices: readonly number[];
  onChange: (minutes: number) => void;
}) {
  return (
    <select
      className="field-input notify-select"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {choices.map((minutes) => (
        <option key={minutes} value={minutes}>
          {noticeLeadLabel(minutes)}
        </option>
      ))}
    </select>
  );
}

/**
 * Settings > Notifications: what notifies, and when it waits. Every notice
 * is written on this device; only its time ever leaves it.
 */
export default function NotificationsSection() {
  useSyncExternalStore(notifications.subscribe, notifications.next);
  const sync = useSyncStatus();
  const [settings, setSettings] = useState(notifications.settings);
  const [quiet, setQuiet] = useState(loadQuietHours);
  const [error, setError] = useState('');
  const permission = notifications.permission();
  const upcoming = notifications.next();
  const update = (next: Partial<NoticeSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    notifications.setSettings(merged);
  };
  const updateQuiet = (next: typeof quiet) => {
    setQuiet(next);
    saveQuietHours(next);
    notifications.refreshSoon();
    void refreshReminders();
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
      {permission === 'default' && (
        <button type="button" className="button-accent" onClick={() => void notifications.ask()}>
          Allow notifications
        </button>
      )}
      {permission === 'denied' && <p className="sheet__hint">Turned off in your phone’s settings.</p>}
      {permission === 'unsupported' && (
        <p className="sheet__hint">
          {isIos && !isInstalled
            ? 'On iPhone, add Proairetos to your Home Screen first.'
            : 'This browser cannot show notifications.'}
        </p>
      )}

      <p className="sheet__hint notify-settings__intro">
        Lead times are counted before something starts. Choose up to two hours ahead for a little more room.
      </p>

      <div className="notify-list">
        <Switch on={settings.items} label="Things with a time" onToggle={() => update({ items: !settings.items })} />
        <Switch
          on={settings.calendars}
          label="Other calendars"
          onToggle={() => update({ calendars: !settings.calendars })}
        >
          <Lead
            label="Minutes before calendar events"
            value={settings.calendarLead}
            choices={noticeLeadChoices}
            onChange={(calendarLead) => update({ calendarLead })}
          />
        </Switch>
        <Switch on={settings.schedule} label="Your schedule" onToggle={() => update({ schedule: !settings.schedule })}>
          <Lead
            label="Minutes before your schedule starts"
            value={settings.scheduleLead}
            choices={noticeLeadChoices}
            onChange={(scheduleLead) => update({ scheduleLead })}
          />
        </Switch>
        <Switch
          on={settings.checkBacks}
          label="Check-back days"
          onToggle={() => update({ checkBacks: !settings.checkBacks })}
        />
        <Switch
          on={settings.lookBacks}
          label="Decisions to look back on"
          onToggle={() => update({ lookBacks: !settings.lookBacks })}
        />
        <Switch on={settings.runs} label="Run days, from Askesis" onToggle={() => update({ runs: !settings.runs })} />
        <Switch on={settings.bell} label="A mindful bell" below onToggle={() => update({ bell: !settings.bell })}>
          {settings.bellAt.map((at, index) => (
            <span key={index} className="notify-bell">
              <input
                type="time"
                className="field-input notify-select"
                aria-label={`Bell time ${index + 1}`}
                value={at}
                onChange={(event) => {
                  if (!event.target.value) return;
                  update({ bellAt: settings.bellAt.map((t, i) => (i === index ? event.target.value : t)) });
                }}
              />
              {settings.bellAt.length > 1 && (
                <button
                  type="button"
                  className="text-link"
                  aria-label={`Remove bell time ${index + 1}`}
                  onClick={() => update({ bellAt: settings.bellAt.filter((_, i) => i !== index) })}
                >
                  Remove
                </button>
              )}
            </span>
          ))}
          {settings.bellAt.length < 3 && (
            <button
              type="button"
              className="text-link"
              onClick={() => update({ bellAt: [...settings.bellAt, '12:30'].sort() })}
            >
              Add a time
            </button>
          )}
        </Switch>
        <Switch on={settings.day} label="A look at your day" onToggle={() => update({ day: !settings.day })}>
          <input
            type="time"
            className="field-input notify-select"
            aria-label="A look at your day, at"
            value={settings.dayAt}
            onChange={(event) => event.target.value && update({ dayAt: event.target.value })}
          />
        </Switch>
      </div>

      <div className="notify-list">
        <Switch on={quiet.on} label="Quiet hours" below onToggle={() => updateQuiet({ ...quiet, on: !quiet.on })}>
          <input
            type="time"
            className="field-input notify-select"
            aria-label="Quiet from"
            value={quiet.start}
            onChange={(event) => event.target.value && updateQuiet({ ...quiet, start: event.target.value })}
          />
          <input
            type="time"
            className="field-input notify-select"
            aria-label="Quiet until"
            value={quiet.end}
            onChange={(event) => event.target.value && updateQuiet({ ...quiet, end: event.target.value })}
          />
        </Switch>
        <Switch
          on={quiet.duringProtected}
          label="Quiet during protected time"
          onToggle={() => updateQuiet({ ...quiet, duringProtected: !quiet.duringProtected })}
        />
        <Switch
          on={settings.details}
          label="Details on the lock screen"
          onToggle={() => update({ details: !settings.details })}
        />
        {permission === 'granted' && sync.phase === 'ready' && (
          <Switch
            on={sync.reminders === 'on'}
            label="Also when the app is closed"
            onToggle={() =>
              sync.reminders === 'on'
                ? void disableReminders()
                : void enableReminders().catch((cause) =>
                    setError(cause instanceof Error ? cause.message : 'That did not work just now.'),
                  )
            }
          />
        )}
        {error && <p className="form-error">{error}</p>}
      </div>

      <details className="notify-coming">
        <summary>Coming up</summary>
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
      </details>

      {permission === 'granted' && (
        <button type="button" className="text-link" onClick={() => void notifications.test()}>
          Show one now
        </button>
      )}
    </section>
  );
}
