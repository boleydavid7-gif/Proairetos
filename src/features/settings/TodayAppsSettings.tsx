import { familyApps } from '../../app/family/FamilyApps';
import { useAddedApps } from '../../app/family/added';
import { useTodayAppsVisibility } from '../../app/hooks/useTodayAppsVisibility';
import { setTodayAppShown } from '../../data/storage/preferences';
import { DAILY_PRACTICE_APPS, WORTH_ATTENTION_APPS, type TodayApp } from '../../core/today/apps';
import { FamilyMark } from '../../app/family/marks';

function AppRows({ apps, hidden, added }: { apps: readonly TodayApp[]; hidden: ReadonlySet<TodayApp>; added: readonly string[] }) {
  return (
    <ul className="today-app-settings__list">
      {apps.filter((app) => added.includes(app)).map((app) => {
        const definition = familyApps.find((each) => each.id === app);
        const shown = !hidden.has(app);
        return (
          <li className="today-app-settings__row" key={app}>
            <FamilyMark app={app} size={22} />
            <span className="today-app-settings__name">{definition?.name ?? app}</span>
            <span className="today-app-settings__state">{shown ? 'Shown' : 'Hidden'}</span>
            <button
              type="button"
              role="switch"
              className={`today-app-settings__switch${shown ? ' is-on' : ''}`}
              aria-checked={shown}
              aria-label={`${definition?.name ?? app} on Today`}
              onClick={() => setTodayAppShown(app, !shown)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** App-level controls for the two compact summaries on Today. Detailed app signals keep their own switches below. */
export default function TodayAppsSettings() {
  const added = useAddedApps();
  const hidden = useTodayAppsVisibility();
  const any = [...DAILY_PRACTICE_APPS, ...WORTH_ATTENTION_APPS].some((app) => added.includes(app));
  return (
    <section className="settings-group today-app-settings" aria-label="App summaries">
      <h2 className="settings-group__label">Apps on Today</h2>
      <p className="section-description">
        Choose which companion apps appear in the two compact Today sections. Tap a row on Today to open its app; these switches only show or hide the summary.
      </p>
      {!any && (
        <div className="settings-card">
          <p className="empty-note">Add companion apps to build your Today overview.</p>
          <a className="text-link" href="/?open=settings:store">Open App Store</a>
        </div>
      )}
      {DAILY_PRACTICE_APPS.some((app) => added.includes(app)) && (
        <div className="settings-card settings-card--rows">
          <p className="sheet__label">Daily practices</p>
          <AppRows apps={DAILY_PRACTICE_APPS} hidden={hidden} added={added} />
        </div>
      )}
      {WORTH_ATTENTION_APPS.some((app) => added.includes(app)) && (
        <div className="settings-card settings-card--rows">
          <p className="sheet__label">Worth your attention</p>
          <AppRows apps={WORTH_ATTENTION_APPS} hidden={hidden} added={added} />
        </div>
      )}
      <p className="sheet__hint">These choices sync with your Proairetos account. They do not remove an app or change its records.</p>
    </section>
  );
}
