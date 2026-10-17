import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { BookIcon, ChevronIcon, HistoryIcon, SettingsIcon, WeightIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import type { DynamisNav } from '../app/App';
import { isSetup, plan, savePlan, settings } from '../app/state';
import { AIM_NAMES } from '../core/plan';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLACE = { gym: 'A gym', home: 'Home, with dumbbells', body: 'No equipment' };

export default function MorePage({ nav }: { nav: DynamisNav }) {
  const current = settings.use();
  const setup = plan.use();
  const ready = isSetup(setup);

  return (
    <div className="page dynamis-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Dynamis" what="Your sessions" waiting="Sessions" />

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'year' })}>
            <span className="row__icon"><HistoryIcon size={22} /></span>
            <span className="row__text"><span>Your year</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'plan' })}>
            <span className="row__icon"><WeightIcon size={22} /></span>
            <span className="row__text">
              <span>Your plan</span>
              <span className="row__detail">{ready ? `${AIM_NAMES[setup.aim]} · ${PLACE[setup.place]} · ${[...setup.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => DAY[day]).join(', ')}` : 'Not made yet'}</span>
            </span>
            <ChevronIcon size={18} />
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'why' })}>
            <span className="row__icon"><BookIcon size={22} /></span>
            <span className="row__text"><span>How the plan is built</span><span className="row__detail">With its sources</span></span>
            <ChevronIcon size={18} />
          </button>
        </li>
      </ul>

      {ready && (
        <>
        <p className="ll-section-label">Reminders</p>
        <section className="card switches">
          <Switch on={current.reminders} label="Training days" onToggle={() => { settings.save({ ...settings.load(), reminders: !current.reminders }); notifications.refreshSoon(); }} />
          {current.reminders && (
            <label className="field">
              <span className="field__label">At</span>
              <input className="input" type="time" value={setup.at ?? '17:30'} onChange={(event) => event.target.value && savePlan({ ...setup, at: event.target.value })} />
            </label>
          )}
        </section>
        </>
      )}

      <section className="card switches">
        <DailyLineSwitch app="dynamis" />
      </section>

      <ul className="rows">
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

      <FamilyApps current="dynamis" />
    </div>
  );
}
