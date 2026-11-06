import { useSyncExternalStore } from 'react';
import { APPS } from '../../core/apps/manifest';
import { familyApps } from '../../app/family/FamilyApps';
import { useAddedApps } from '../../app/family/added';
import { FamilyMark } from '../../app/family/marks';
import { providerEnabled } from '../../app/providers/context';
import { providerSwitches, providerSwitchesSnapshot, setProviderEnabled, subscribePreferences } from '../../data/storage/preferences';

/** One switch for each added app that has something to offer universal search. Search lists only the apps switched on. */
export default function SearchAppsSettings() {
  const added = useAddedApps();
  useSyncExternalStore(subscribePreferences, providerSwitchesSnapshot);
  const switches = providerSwitches();
  const apps = APPS.filter((app) => app.provides?.includes('search') && added.includes(app.id as never));
  if (!apps.length) return null;
  return (
    <section className="settings-group today-app-settings" aria-label="Apps in search">
      <h2 className="settings-group__label">Apps in search</h2>
      <div className="settings-card settings-card--rows">
        <ul className="today-app-settings__list">
          {apps.map((app) => {
            const on = providerEnabled(app.id, 'search', switches);
            const name = familyApps.find((each) => each.id === app.id)?.name ?? app.name;
            return (
              <li className="today-app-settings__row" key={app.id}>
                <FamilyMark app={app.id as never} size={22} />
                <span className="today-app-settings__name">{name}</span>
                <span className="today-app-settings__state">{on ? 'On' : 'Off'}</span>
                <button
                  type="button"
                  role="switch"
                  className={`today-app-settings__switch${on ? ' is-on' : ''}`}
                  aria-checked={on}
                  aria-label={`${name} in search`}
                  onClick={() => setProviderEnabled(app.id, 'search', !on)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
