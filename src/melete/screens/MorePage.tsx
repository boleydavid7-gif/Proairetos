import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { HistoryIcon, SettingsIcon } from '../../app/family/icons';
import { DurationWheel } from '../../app/family/TimeWheel';
import type { MeleteNav } from '../app/App';
import { settings } from '../app/state';

export default function MorePage({ nav }: { nav: MeleteNav }) {
  const current = settings.use();
  return (
    <div className="page melete-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Meletē" what="Your subjects and study sessions" waiting="Study" />

      <section className="card switches">
        <DailyLineSwitch app="melete" />
      </section>

      <section className="card">
        <DurationWheel label="Usual session length" minutes={current.minutes} onChange={(minutes) => settings.save({ ...settings.load(), minutes })} />
      </section>

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
      <FamilyApps current="melete" />
    </div>
  );
}
