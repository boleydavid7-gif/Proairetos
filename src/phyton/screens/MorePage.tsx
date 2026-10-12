import { useState } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { ChevronIcon, HistoryIcon, PeopleIcon, SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { findPlace, placeFromDevice } from '../../app/weather/weather';
import { Segmented, Switch } from '../../askesis/app/ui';
import { displayName } from '../../data/storage/preferences';
import type { PhytonNav } from '../app/App';
import { myName, settings, useHome, usePlants, type PhytonSettings } from '../app/state';
import { rainPlace, refreshRain, setRainPlace } from '../app/rain';
import { namesIn } from '../core/plants';
import { CARE_SOURCE } from '../core/species';
import { IDENTIFY_SOURCE } from '../app/identify';

function RainPlace() {
  const [place, setPlace] = useState(rainPlace);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [error, setError] = useState('');
  const choose = (next: { name: string; lat: number; lon: number }) => {
    setRainPlace(next);
    setPlace(next);
    setFound([]);
    setQuery('');
  };
  return (
    <div className="field">
      <span className="field__label">Rain at</span>
      {place && <p>{place.name}</p>}
      <form
        className="add-line"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          void findPlace(query).then(setFound).catch((cause: Error) => setError(cause.message));
        }}
      >
        <input className="input" aria-label="A town" placeholder="A town" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!query.trim()}>Find</button>
      </form>
      <button type="button" className="text-link" onClick={() => void placeFromDevice().then(choose).catch((cause: Error) => setError(cause.message))}>Use this phone’s location</button>
      {found.length > 0 && (
        <div className="chip-row">
          {found.map((each) => <button key={`${each.lat},${each.lon}`} type="button" className="chip" onClick={() => choose(each)}>{each.name}</button>)}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="hint">Daily rainfall from Open-Meteo. Only the place, to about a kilometre, is sent; it stays on this phone.</p>
    </div>
  );
}

export default function MorePage({ nav }: { nav: PhytonNav }) {
  const current = settings.use();
  const home = useHome();
  const plants = usePlants();
  const names = namesIn(plants, [myName(current)]);
  const change = (patch: Partial<PhytonSettings>) => {
    settings.save({ ...settings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<PhytonSettings['notices']>) => change({ notices: { ...current.notices, ...patch } });

  return (
    <div className="page phyton-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Phyton" what="Your plants" waiting="Plants" />

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'year' })}>
            <span className="row__icon"><HistoryIcon size={21} /></span>
            <span className="row__text"><span>Your year</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'home' })}>
            <span className="row__icon"><PeopleIcon size={21} /></span>
            <span className="row__text"><span>Share</span><span className="row__detail">{home ? home.name : 'With the people you live with'}</span></span>
            <ChevronIcon size={17} />
          </button>
        </li>
      </ul>

      <section className="card">
        <label className="field">
          <span className="field__label">Your name here (optional)</span>
          <input className="input" list="phyton-me" value={current.me} onChange={(event) => change({ me: event.target.value })} placeholder={displayName() || 'For Mine and for who watered'} />
          <datalist id="phyton-me">{names.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
        <div className="field">
          <span className="field__label">Seasons</span>
          <Segmented label="Hemisphere" value={current.hemisphere} options={[{ id: 'north', label: 'Northern' }, { id: 'south', label: 'Southern' }]} onChange={(hemisphere) => change({ hemisphere })} small />
        </div>
      </section>

      <section className="card switches">
        <Switch
          on={current.rain}
          label="Rain counts"
          detail="For plants outside"
          onToggle={() => {
            change({ rain: !current.rain });
            if (!current.rain) void refreshRain(true);
          }}
        />
        {current.rain && <RainPlace />}
      </section>

      <section className="card switches">
        <DailyLineSwitch app="phyton" />
      </section>

      <section className="card switches">
        <p className="label diaita-switches-label">Reminders</p>
        <Switch on={current.notices.on} label="Plants to check" onToggle={() => notice({ on: !current.notices.on })} />
        {current.notices.on && <Switch on={current.notices.feed} label="Feeding" onToggle={() => notice({ feed: !current.notices.feed })} />}
        {current.notices.on && myName(current) && home && <Switch on={current.notices.onlyMine} label="Only mine" onToggle={() => notice({ onlyMine: !current.notices.onlyMine })} />}
        {current.notices.on && (
          <label className="field philia-at">
            <span className="field__label">At</span>
            <input className="input" type="time" value={current.notices.at} onChange={(event) => event.target.value && notice({ at: event.target.value })} />
          </label>
        )}
      </section>

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

      <section className="card">
        <h2 className="card__title card__title--small">Sources</h2>
        <p className="fine">{CARE_SOURCE}</p>
        <p className="fine">{IDENTIFY_SOURCE}</p>
        <p className="fine">Watering days stretch half as long again in winter and a quarter in the months either side, as plants grow less in short days (RHS).</p>
      </section>

      <FamilyApps current="phyton" />
    </div>
  );
}
