import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { WeekIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { settings, type PoreiaSettings } from '../app/state';
import { PlaceSearch } from '../app/ui';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF', 'MXN', 'BRL', 'INR', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR'];

export default function MorePage({ nav }: { nav: PoreiaNav }) {
  const current = settings.use();
  const change = (patch: Partial<PoreiaSettings>) => settings.save({ ...settings.load(), ...patch });
  const notice = (patch: Partial<PoreiaSettings['notices']>) => {
    change({ notices: { ...current.notices, ...patch } });
    notifications.refreshSoon();
  };
  const leads = [30, 60, 90, 120, 180, 240];
  const leadText = (minutes: number) => (minutes < 60 ? `${minutes} minutes` : minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`);
  const currencies = CURRENCIES.includes(current.currency) ? CURRENCIES : [current.currency, ...CURRENCIES];

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">More</h1>
      </div>
      <AccountCard app="Poreia" what="Your trips" waiting="Trips" />

      <section className="card">
        <PlaceSearch label="Home" value={current.home} onPick={(home) => change({ home })} />
        <div className="input-row">
          <label className="field">
            <span className="field__label">Currency</span>
            <select className="input" value={current.currency} onChange={(event) => change({ currency: event.target.value })}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Travelers</span>
            <input className="input" type="number" min={1} max={20} value={current.travelers} onChange={(event) => change({ travelers: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })} />
          </label>
        </div>
      </section>

      <div className="button-row">
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'documents' })}>
          Documents
        </button>
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'been' })}>
          Where you’ve been
        </button>
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'year' })}>
          Your year
        </button>
      </div>

      <p className="ll-section-label">Reminders</p>
      <section className="card switches">
        <Switch on={current.notices.on} label="Bookings and plans" onToggle={() => notice({ on: !current.notices.on })} />
        {current.notices.on && (
          <>
            <label className="field">
              <span className="field__label">Before a timed booking</span>
              <select className="input" value={current.notices.travelLead} onChange={(event) => notice({ travelLead: Number(event.target.value) })}>
                {leads.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {leadText(minutes)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Before a stay, car, ticket or plan</span>
              <select className="input" value={current.notices.otherLead} onChange={(event) => notice({ otherLead: Number(event.target.value) })}>
                {[15, ...leads.slice(0, 4)].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {leadText(minutes)}
                  </option>
                ))}
              </select>
            </label>
            <Switch on={current.notices.dayBefore} label="The evening before a trip" detail="First plan and what’s left to pack" onToggle={() => notice({ dayBefore: !current.notices.dayBefore })} />
          </>
        )}
      </section>

      <section className="card switches">
        <DailyLineSwitch app="poreia" />
      </section>

      <ul className="rows">
        <li>
          <a className="row" href="/?open=settings:calendars">
            <span className="row__icon">
              <WeekIcon size={22} />
            </span>
            <span className="row__text">
              <span>Trips in Proairetos</span>
              <span className="row__detail">Days ahead shows trips and time off</span>
            </span>
          </a>
        </li>
        <li>
          <a className="row" href="/?open=settings:notifications">
            <span className="row__icon">
              <SettingsIcon size={22} />
            </span>
            <span className="row__text">
              <span>Notifications and appearance</span>
              <span className="row__detail">In Proairetos</span>
            </span>
          </a>
        </li>
      </ul>

      <p className="fine">Poreia keeps your trip plans, bookings, documents, packing, spending, and notes on this device. It does not require travel-data services.</p>

      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>

      <FamilyApps current="poreia" />
    </div>
  );
}
