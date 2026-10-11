import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { ChevronIcon, PeopleIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { settings, useChores, useHome, type ErgonSettings } from '../app/state';
import { namesIn, whoDidWhat } from '../core/chores';

export default function MorePage({ nav }: { nav: ErgonNav }) {
  const current = settings.use();
  const home = useHome();
  const chores = useChores();
  const names = namesIn(chores, [current.me]);
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
          <button type="button" className="row" onClick={() => nav.go({ name: 'household' })}>
            <span className="row__icon"><PeopleIcon size={21} /></span>
            <span className="row__text"><span>Household</span><span className="row__detail">{home ? home.name : 'Share chores with the people you live with'}</span></span>
            <ChevronIcon size={17} />
          </button>
        </li>
      </ul>

      <section className="card">
        <label className="field">
          <span className="field__label">Your name here (optional)</span>
          <input className="input" list="ergon-me" value={current.me} onChange={(event) => change({ me: event.target.value })} placeholder="For Mine and for who did what" />
          <datalist id="ergon-me">{names.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
      </section>

      <section className="card switches">
        <p className="label diaita-switches-label">Reminders</p>
        <Switch on={current.notices.on} label="Chores" onToggle={() => notice({ on: !current.notices.on })} />
        {current.notices.on && current.me && <Switch on={current.notices.onlyMine} label="Only mine" onToggle={() => notice({ onlyMine: !current.notices.onlyMine })} />}
        {current.notices.on && (
          <label className="field philia-at">
            <span className="field__label">At</span>
            <input className="input" type="time" value={current.notices.at} onChange={(event) => event.target.value && notice({ at: event.target.value })} />
          </label>
        )}
      </section>

      {facts.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Done, last 30 days</h2>
          <ul className="notes-list">
            {facts.map((fact) => (
              <li key={fact.name} className="note-line"><span>{fact.name}</span><span className="muted">{fact.times}</span></li>
            ))}
          </ul>
        </section>
      )}

      <ul className="rows">
        <li>
          <a className="row" href="/?open=settings:notifications">
            <span className="row__icon"><SettingsIcon size={21} /></span>
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
