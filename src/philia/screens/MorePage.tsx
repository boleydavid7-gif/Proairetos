import { useEffect, useState } from 'react';
import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { readStore } from '../../app/family/read';
import { offerUndo, say } from '../../app/family/shell';
import { SettingsIcon } from '../../app/family/icons';
import { notifications } from '../../app/notify/notifications';
import { Switch } from '../../askesis/app/ui';
import type { CompassStatement } from '../../core/compass/types';
import type { PhiliaNav } from '../app/App';
import { newId, people, settings, type PhiliaSettings } from '../app/state';
import { fromCompass, newPerson } from '../core/people';

const LEADS = [
  { days: 0, label: 'On the day' },
  { days: 1, label: 'The day before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: 'A week before' },
];

function useCompassPeople() {
  const [list, setList] = useState<CompassStatement[]>([]);
  useEffect(() => {
    void readStore<CompassStatement>('statements').then((all) => setList(all.filter((each) => each.type === 'PERSON')));
  }, []);
  return list;
}

export default function MorePage({ nav: _nav }: { nav: PhiliaNav }) {
  const current = settings.use();
  const all = people.use();
  const waiting = fromCompass(all, useCompassPeople());
  const notice = (patch: Partial<PhiliaSettings['notices']>) => {
    settings.save({ ...settings.load(), notices: { ...current.notices, ...patch } });
    notifications.refreshSoon();
  };

  const bringIn = () => {
    const now = new Date();
    const added = waiting.map((each) => ({
      ...newPerson(newId(), each.body, now),
      compassId: each.id,
      lastInTouch: each.inTouchAt,
      notes: each.note ? [{ id: newId(), text: each.note, at: now.toISOString() }] : [],
    }));
    for (const person of added) people.put(person);
    if (added.length) offerUndo(added.length === 1 ? 'One person brought in' : `${added.length} people brought in`, () => added.forEach((person) => people.remove(person.id)));
    else say('Everyone is here already');
  };

  return (
    <div className="page philia-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Philia" what="Your people" waiting="People" />

      {waiting.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">From Compass</h2>
          <p className="muted">{waiting.map((each) => each.body).join(', ')}</p>
          <button type="button" className="button-quiet" onClick={bringIn}>Bring in</button>
        </section>
      )}

      <section className="card switches">
        <p className="label diaita-switches-label">Reminders</p>
        <Switch on={current.notices.dates} label="Birthdays and dates" onToggle={() => notice({ dates: !current.notices.dates })} />
        {current.notices.dates && (
          <select className="input" aria-label="When" value={current.notices.dateLead} onChange={(event) => notice({ dateLead: Number(event.target.value) })}>
            {LEADS.map((lead) => <option key={lead.days} value={lead.days}>{lead.label}</option>)}
          </select>
        )}
        <Switch on={current.notices.inTouch} label="Keep in touch" onToggle={() => notice({ inTouch: !current.notices.inTouch })} />
        <label className="field philia-at">
          <span className="field__label">At</span>
          <input className="input" type="time" value={current.notices.at} onChange={(event) => event.target.value && notice({ at: event.target.value })} />
        </label>
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

      <FamilyApps current="philia" />
    </div>
  );
}
