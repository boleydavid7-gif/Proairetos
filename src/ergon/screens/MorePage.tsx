import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { useHousehold } from '../../app/household/household';
import { ChevronIcon, HistoryIcon, PeopleIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { settings, useChores, useHome, type ErgonSettings, myName } from '../app/state';
import { namesIn, whoDidWhat } from '../core/chores';

export default function MorePage({ nav }: { nav: ErgonNav }) {
  const current = settings.use();
  const home = useHome();
  const chores = useChores();
  const family = useHousehold();
  const names = [...new Set([...namesIn(chores, [myName(current)]), ...family.members.map((member) => member.name)])].sort((a, b) => a.localeCompare(b));
  const facts = whoDidWhat(chores, toLocalDate(new Date()));
  const change = (patch: Partial<ErgonSettings>) => {
    settings.save({ ...settings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<ErgonSettings['notices']>) => change({ notices: { ...current.notices, ...patch } });

  return (
    <div className="page ergon-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Ergon" what="Your chores" waiting="Chores" />

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'year' })}>
            <span className="row__icon"><HistoryIcon size={22} /></span>
            <span className="row__text"><span>Your year</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'household' })}>
            <span className="row__icon"><PeopleIcon size={22} /></span>
            <span className="row__text"><span>Family</span>{home && <span className="row__detail">{home.name}</span>}</span>
            <ChevronIcon size={18} />
          </button>
        </li>
      </ul>

      {!family.parts.some((part) => part.app === 'ergon') && (
      <section className="card">
        <label className="field">
          <span className="field__label">Your name here (optional)</span>
          <input className="input" list="ergon-me" value={current.me} onChange={(event) => change({ me: event.target.value })} />
          <datalist id="ergon-me">{names.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
      </section>
      )}

      <section className="card switches">
        <Switch
          on={Boolean(current.daysOff)}
          label="On days off"
          onToggle={() => change({ daysOff: !current.daysOff })}
        />
        <DailyLineSwitch app="ergon" />
      </section>

      <p className="ll-section-label">Reminders</p>
      <section className="card switches">
        <Switch on={current.notices.on} label="Chores" onToggle={() => notice({ on: !current.notices.on })} />
        {current.notices.on && myName(current) && <Switch on={current.notices.onlyMine} label="Only my assignments" onToggle={() => notice({ onlyMine: !current.notices.onlyMine })} />}
        {current.notices.on && (
          <label className="field philia-at">
            <span className="field__label">Time</span>
            <input className="input" type="time" value={current.notices.at} onChange={(event) => event.target.value && notice({ at: event.target.value })} />
          </label>
        )}
      </section>

      {facts.length > 0 && (
        <>
          <p className="ll-section-label">Done, last 30 days</p>
          <ul className="rows">
            {facts.map((fact) => (
              <li key={fact.name} className="row row--aside"><span className="row__text"><span>{fact.name}</span></span><span className="muted">{fact.times}</span></li>
            ))}
          </ul>
        </>
      )}

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

      <FamilyApps current="ergon" />
    </div>
  );
}
