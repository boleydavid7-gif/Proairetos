import { useEffect, useState } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { WeekIcon, ClockIcon, SettingsIcon } from '../../app/family/icons';
import type { PoreiaNav } from '../app/App';
import { settings, type PoreiaSettings } from '../app/state';
import { PlaceSearch } from '../app/ui';
import { eventsReady } from '../app/world';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF', 'MXN', 'BRL', 'INR', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR'];

export default function MorePage({ nav }: { nav: PoreiaNav }) {
  const current = settings.use();
  const change = (patch: Partial<PoreiaSettings>) => settings.save({ ...settings.load(), ...patch });
  const [events, setEvents] = useState<boolean>();
  useEffect(() => {
    void eventsReady().then(setEvents);
  }, []);
  const currencies = CURRENCIES.includes(current.currency) ? CURRENCIES : [current.currency, ...CURRENCIES];

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">More</h1>
      </div>
      <AccountCard app="Poreia" what="Your trips" waiting="Trips" />

      <section className="card">
        <PlaceSearch label="Home (optional)" value={current.home} onPick={(home) => change({ home })} />
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
        <p className="label">Temperature</p>
        <div className="chip-row" role="group" aria-label="Temperature">
          {(['F', 'C'] as const).map((unit) => (
            <button key={unit} type="button" className="chip" aria-pressed={current.temperature === unit} onClick={() => change({ temperature: unit })}>
              {unit === 'F' ? 'Fahrenheit' : 'Celsius'}
            </button>
          ))}
        </div>
      </section>

      <section className="card switches">
        <DailyLineSwitch app="poreia" />
      </section>

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'time-setup' })}>
            <span className="row__icon">
              <ClockIcon size={22} />
            </span>
            <span className="row__text">
              <span>Time off balance</span>
              <span className="row__detail">{current.timeOff ? 'Set' : 'Not set up'}</span>
            </span>
          </button>
        </li>
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

      <p className="fine">
        Places and weather from Open-Meteo, guides from Wikivoyage and Wikipedia, rates from the European Central Bank, holidays from Nager.Date
        {events ? ', events from Ticketmaster' : ''}. Bookings are made on each company’s own site.
      </p>

      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>

      <FamilyApps current="poreia" />
    </div>
  );
}
