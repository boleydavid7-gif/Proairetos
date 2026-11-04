import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { HistoryIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import type { KtemaNav } from '../app/App';
import { householdLists } from '../../app/household/household';
import { settings, type KtemaSettings } from '../app/state';

export default function MorePage({ nav }: { nav: KtemaNav }) {
  const current = settings.use();
  const change = (patch: Partial<KtemaSettings>) => {
    settings.save({ ...settings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<KtemaSettings['notices']>) => change({ notices: { ...current.notices, ...patch } });

  return (
    <div className="page ktema-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Ktema" what="Your things" waiting="Things" />

      <section className="card switches">
        <DailyLineSwitch app="ktema" />
      </section>

      {householdLists('ktema')?.ids.length ? (
        <p className="hint">
          Shared with {householdLists('ktema')?.name}. Documents, photos and files stay private. <a className="text-link" href="/?open=settings:household">Household settings</a>
        </p>
      ) : null}

      <p className="ll-section-label">Reminders</p>
      <section className="card switches">
        <Switch on={current.notices.on} label="Upkeep" onToggle={() => notice({ on: !current.notices.on })} />
        <Switch on={current.notices.warranties} label="Warranties and documents, a month before they end" onToggle={() => notice({ warranties: !current.notices.warranties })} />
        {(current.notices.on || current.notices.warranties) && (
          <label className="field">
            <span className="field__label">Time</span>
            <input className="input" type="time" value={current.notices.at} onChange={(event) => event.target.value && notice({ at: event.target.value })} />
          </label>
        )}
      </section>

      <ul className="rows">
        <li className="row row--aside">
          <span className="row__text"><span>Distance in</span></span>
          <select className="row__select" aria-label="Distance in" value={current.distance} onChange={(event) => change({ distance: event.target.value as 'mi' | 'km' })}>
            <option value="mi">Miles</option>
            <option value="km">Kilometers</option>
          </select>
        </li>
      </ul>

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'year' })}>
            <span className="row__icon"><HistoryIcon size={22} /></span>
            <span className="row__text"><span>Your year</span></span>
          </button>
        </li>
        <li>
          <a className="row" href="/?open=settings:notifications">
            <span className="row__icon"><SettingsIcon size={22} /></span>
            <span className="row__text"><span>Notifications and appearance</span><span className="row__detail">In Proairetos</span></span>
          </a>
        </li>
      </ul>

      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>

      <FamilyApps current="ktema" />
    </div>
  );
}
