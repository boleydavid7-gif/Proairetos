import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { BookIcon, SettingsIcon } from '../../app/family/icons';
import { Switch } from '../../askesis/app/ui';
import { notifications } from '../../app/notify/notifications';
import type { DiaitaNav } from '../app/App';
import { settings, type DiaitaSettings } from '../app/state';

function NumberField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="family-unit">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
          }}
        />
        <span>{unit}</span>
      </span>
    </label>
  );
}

export default function MorePage({ nav }: { nav: DiaitaNav }) {
  const current = settings.use();
  const change = (patch: Partial<DiaitaSettings>) => {
    settings.save({ ...settings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<DiaitaSettings['notices']>) => change({ notices: { ...current.notices, ...patch } });

  return (
    <div className="page diaita-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Diaita" what="Your plan and sleep log" waiting="Sleep" />

      <section className="card diaita-settings">
        <p className="label">Your plan</p>
        <div className="input-row">
          <label className="field">
            <span className="field__label">Usual bedtime</span>
            <input className="input" type="time" value={current.bedtime} onChange={(event) => event.target.value && change({ bedtime: event.target.value })} />
          </label>
          <NumberField label="Sleep" value={current.sleepHours} min={5} max={10} step={0.5} unit="h" onChange={(sleepHours) => change({ sleepHours })} />
        </div>
        <div className="input-row">
          <NumberField label="Travel to work" value={current.commuteMinutes} min={0} max={180} step={5} unit="min" onChange={(commuteMinutes) => change({ commuteMinutes })} />
          <NumberField label="Getting ready" value={current.readyMinutes} min={0} max={180} step={5} unit="min" onChange={(readyMinutes) => change({ readyMinutes })} />
        </div>
        <div className="input-row">
          <NumberField label="Last caffeine before sleep" value={current.cutoffHours} min={0} max={12} step={1} unit="h" onChange={(cutoffHours) => change({ cutoffHours })} />
          <NumberField label="Wind-down" value={current.windDownMinutes} min={0} max={120} step={15} unit="min" onChange={(windDownMinutes) => change({ windDownMinutes })} />
        </div>
      </section>

      <section className="card switches">
        <Switch on={current.light} label="Light" onToggle={() => change({ light: !current.light })} />
        <Switch on={current.meals} label="Meals" onToggle={() => change({ meals: !current.meals })} />
      </section>

      <section className="card switches">
        <p className="label diaita-switches-label">Reminders</p>
        <Switch on={current.notices.windDown} label="Wind down" onToggle={() => notice({ windDown: !current.notices.windDown })} />
        <Switch on={current.notices.nap} label="Nap" onToggle={() => notice({ nap: !current.notices.nap })} />
        <Switch on={current.notices.caffeine} label="Last caffeine" onToggle={() => notice({ caffeine: !current.notices.caffeine })} />
      </section>

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'sources' })}>
            <span className="row__icon"><BookIcon size={21} /></span>
            <span className="row__text"><span>Sources</span></span>
          </button>
        </li>
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

      <FamilyApps current="diaita" />
    </div>
  );
}
