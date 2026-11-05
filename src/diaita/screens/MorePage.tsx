import AccountCard from '../../app/family/AccountCard';
import { DailyLineSwitch } from '../../app/family/DailyLine';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';
import { BookIcon, HistoryIcon, SettingsIcon } from '../../app/family/icons';
import { Switch } from '../../askesis/app/ui';
import { notifications } from '../../app/notify/notifications';
import type { DiaitaNav } from '../app/App';
import { NumberField } from '../app/ui';
import { settings, usePlan, type DiaitaSettings } from '../app/state';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { useAddedApps } from '../../app/family/added';
import MoreDetails from '../../app/family/MoreDetails';

export default function MorePage({ nav }: { nav: DiaitaNav }) {
  const current = settings.use();
  const added = useAddedApps();
  const today = toLocalDate(new Date());
  // A rotating schedule: each named shift in the next four weeks gets its own two boxes.
  const { blocks } = usePlan(today, addDays(today, 28));
  const names = [...new Set(blocks.filter((block) => block.kind !== 'PROTECTED' && block.label).map((block) => block.label as string))].sort();
  const rotations = names.length > 1 ? names : [];
  const change = (patch: Partial<DiaitaSettings>) => {
    settings.save({ ...settings.load(), ...patch });
    notifications.refreshSoon();
  };
  const notice = (patch: Partial<DiaitaSettings['notices']>) => change({ notices: { ...current.notices, ...patch } });

  return (
    <div className="page diaita-page diaita-more">
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
        <MoreDetails label="Details">
        <div className="input-row">
          <NumberField label="Travel to work" value={current.commuteMinutes} min={0} max={180} step={5} unit="min" onChange={(commuteMinutes) => change({ commuteMinutes })} />
          <NumberField label="Getting ready" value={current.readyMinutes} min={0} max={180} step={5} unit="min" onChange={(readyMinutes) => change({ readyMinutes })} />
        </div>
        <div className="input-row">
          <NumberField label="Adjust sleep time" value={current.sleepShift ?? 0} min={-240} max={240} step={5} unit="min" onChange={(sleepShift) => change({ sleepShift })} />
          <NumberField label="Adjust wake time" value={current.wakeShift ?? 0} min={-240} max={240} step={5} unit="min" onChange={(wakeShift) => change({ wakeShift })} />
        </div>
        {rotations.map((name) => {
          const own = current.shiftAdjust?.[name] ?? { sleep: current.sleepShift ?? 0, wake: current.wakeShift ?? 0 };
          const set = (patch: Partial<{ sleep: number; wake: number }>) => change({ shiftAdjust: { ...current.shiftAdjust, [name]: { ...own, ...patch } } });
          return (
            <div key={name}>
              <p className="label">{name}</p>
              <div className="input-row">
                <NumberField label="Adjust sleep time" value={own.sleep} min={-240} max={240} step={5} unit="min" onChange={(sleep) => set({ sleep })} />
                <NumberField label="Adjust wake time" value={own.wake} min={-240} max={240} step={5} unit="min" onChange={(wake) => set({ wake })} />
              </div>
            </div>
          );
        })}
        <div className="input-row">
          <NumberField label="Last caffeine before sleep" value={current.cutoffHours} min={0} max={12} step={1} unit="h" onChange={(cutoffHours) => change({ cutoffHours })} />
          <NumberField label="Wind-down" value={current.windDownMinutes} min={0} max={120} step={15} unit="min" onChange={(windDownMinutes) => change({ windDownMinutes })} />
        </div>
        <label className="field">
          <span className="field__label">Worry time</span>
          <input className="input" type="time" value={current.worryTime} onChange={(event) => event.target.value && change({ worryTime: event.target.value })} />
        </label>
        </MoreDetails>
      </section>

      <section className="card switches">
        <DailyLineSwitch app="diaita" />
      </section>

      <section className="card switches">
        <Switch on={current.light} label="Light" onToggle={() => change({ light: !current.light })} />
        <Switch on={current.meals} label="Meals" onToggle={() => change({ meals: !current.meals })} />
        {(added.includes('askesis') || added.includes('dynamis')) && (
          <Switch
            on={Boolean(current.trainingClearOfNaps)}
            label="Scheduled naps"
            onToggle={() => change({ trainingClearOfNaps: !current.trainingClearOfNaps })}
          />
        )}
      </section>

      <p className="ll-section-label">Reminders</p>
      <section className="card switches">
        <Switch on={current.notices.windDown} label="Wind down" onToggle={() => notice({ windDown: !current.notices.windDown })} />
        <Switch on={current.notices.worry} label="Worry time" onToggle={() => notice({ worry: !current.notices.worry })} />
        <Switch on={current.notices.nap} label="Nap" onToggle={() => notice({ nap: !current.notices.nap })} />
        <Switch on={current.notices.caffeine} label="Last caffeine" onToggle={() => notice({ caffeine: !current.notices.caffeine })} />
        <Switch on={Boolean(current.notices.daylight)} label="Morning daylight" onToggle={() => notice({ daylight: !current.notices.daylight })} />
      </section>

      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'worry' })}>
            <span className="row__icon"><BookIcon size={22} /></span>
            <span className="row__text"><span>Worry time</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'year' })}>
            <span className="row__icon"><HistoryIcon size={22} /></span>
            <span className="row__text"><span>Your year</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => nav.go({ name: 'sources' })}>
            <span className="row__icon"><BookIcon size={22} /></span>
            <span className="row__text"><span>Sources</span></span>
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

      <FamilyApps current="diaita" />
    </div>
  );
}
