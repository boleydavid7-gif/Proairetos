import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { HistoryIcon, PeopleIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import type { TherapeiaNav } from '../app/App';
import { settings, useCircle, type TherapeiaSettings } from '../app/state';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { useAddedApps } from '../../app/family/added';

const LEADS = [
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 120, label: '2 hours before' },
  { minutes: 1440, label: 'The day before' },
];

export default function MorePage({ nav }: { nav: TherapeiaNav }) {
  const circle = useCircle();
  const current = settings.use();
  const rhythm = diaitaSettings.use();
  const diaitaAdded = useAddedApps().includes('diaita');
  // The same usual bedtime Diaita keeps, so the two never disagree when both are added.
  const sleepChange = (patch: Partial<typeof rhythm>) => {
    diaitaSettings.save({ ...diaitaSettings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<TherapeiaSettings['notices']>) => {
    settings.save({ ...settings.load(), notices: { ...current.notices, ...patch } });
    notifications.refreshSoon();
  };

  return (
    <div className="page therapeia-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Therapeia" what="Your medicines and visits" waiting="Medicines" />

      <section className="card switches">
        <DailyLineSwitch app="therapeia" />
      </section>

      <section className="card">
        <h2 className="card__title card__title--small">Health card</h2>
        <label className="field">
          <span className="field__label">Allergies (optional)</span>
          <input className="input" value={current.card.allergies ?? ''} onChange={(event) => settings.save({ ...settings.load(), card: { ...current.card, allergies: event.target.value || undefined } })} />
        </label>
        <label className="field">
          <span className="field__label">Conditions (optional)</span>
          <input className="input" value={current.card.conditions ?? ''} onChange={(event) => settings.save({ ...settings.load(), card: { ...current.card, conditions: event.target.value || undefined } })} />
        </label>
        <label className="field">
          <span className="field__label">Emergency contact (optional)</span>
          <input className="input" value={current.card.contact ?? ''} onChange={(event) => settings.save({ ...settings.load(), card: { ...current.card, contact: event.target.value || undefined } })} placeholder="Name and number" />
        </label>
        <p className="fine">Shown on Medicines and added when you share the list.</p>
      </section>

      <p className="ll-section-label">Reminders</p>
      <section className="card switches">
        <Switch on={current.notices.doses} label="Doses" onToggle={() => notice({ doses: !current.notices.doses })} />
        <Switch on={current.notices.names} label="Names on the lock screen" onToggle={() => notice({ names: !current.notices.names })} />
        <Switch on={current.notices.refills} label="Refills" onToggle={() => notice({ refills: !current.notices.refills })} />
        <Switch on={current.notices.appointments} label="Visits" onToggle={() => notice({ appointments: !current.notices.appointments })} />
        {current.notices.appointments && (
          <label className="field">
            <span className="field__label">Visit reminder</span>
            <select className="input" value={current.notices.appointmentLead} onChange={(event) => notice({ appointmentLead: Number(event.target.value) })}>
              {LEADS.map((lead) => <option key={lead.minutes} value={lead.minutes}>{lead.label}</option>)}
            </select>
          </label>
        )}
      </section>

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'circle' })}>
            <span className="row__icon"><PeopleIcon size={22} /></span>
            <span className="row__text"><span>Share with someone who helps</span>{circle && <span className="row__detail">{circle.name}</span>}</span>
          </button>
        </li>
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
        {diaitaAdded && (
          <li>
            <a className="row" href="/diaita/?open=more">
              <span className="row__icon"><SettingsIcon size={22} /></span>
              <span className="row__text"><span>Waking and sleep</span><span className="row__detail">Set in Diaita</span></span>
            </a>
          </li>
        )}
      </ul>

      {!diaitaAdded && (
        <section className="card">
          <h2 className="card__title card__title--small">Waking and sleep</h2>
          <div className="input-row">
            <label className="field">
              <span className="field__label">Usual bedtime</span>
              <input className="input" type="time" value={rhythm.bedtime} onChange={(event) => event.target.value && sleepChange({ bedtime: event.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Hours of sleep</span>
              <select className="input" value={rhythm.sleepHours} onChange={(event) => sleepChange({ sleepHours: Number(event.target.value) })}>
                {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hours) => <option key={hours} value={hours}>{hours}</option>)}
              </select>
            </label>
          </div>
          <p className="fine">Doses after waking and before sleep follow these, and your work schedule in Proairetos.</p>
        </section>
      )}

      <p className="fine">Follow the directions you were given. Therapeia reminds and records; it gives no medical advice.</p>

      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>

      <FamilyApps current="therapeia" />
    </div>
  );
}
