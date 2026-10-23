import { useState } from 'react';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { recountPlanned } from '../app/proairetos';
import { settings, setupOrDefault, today } from '../app/state';
import { ACCRUAL_CHOICES, fullWeekHours, type AccrualEvery, type TimeOffSetup } from '../core/timeOff';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The balance and how it grows, as the person's pay stub or HR page shows it. */
export default function TimeOffSetupPage({ nav }: { nav: PoreiaNav }) {
  const [setup, setSetup] = useState<TimeOffSetup>(() => ({ ...setupOrDefault(), asOf: settings.load().timeOff?.asOf ?? today() }));
  const set = (patch: Partial<TimeOffSetup>) => setSetup((current) => ({ ...current, ...patch }));
  const number = (text: string) => (text.trim() === '' ? 0 : Number(text.replace(',', '.')));

  return (
    <div className="page poreia-page">
      <BackLink label="Time off" onBack={nav.back} />
      <h1 className="title">Your balance</h1>

      <section className="card">
        <div className="input-row">
          <label className="field">
            <span className="field__label">Hours on hand</span>
            <input className="input" inputMode="decimal" value={setup.balance || ''} placeholder="0" onChange={(event) => set({ balance: number(event.target.value) })} />
          </label>
          <label className="field">
            <span className="field__label">As of</span>
            <input className="input" type="date" value={setup.asOf} onChange={(event) => event.target.value && set({ asOf: event.target.value })} />
          </label>
        </div>
      </section>

      <p className="ll-section-label">How it grows</p>
      <section className="card">
        <label className="field">
          <span className="field__label">Added</span>
          <select className="input" value={setup.every} onChange={(event) => set({ every: event.target.value as AccrualEvery })}>
            {ACCRUAL_CHOICES.map((each) => (
              <option key={each.id} value={each.id}>
                {each.label}
              </option>
            ))}
          </select>
        </label>
        {setup.every !== 'none' && (
          <div className="input-row">
            <label className="field">
              <span className="field__label">Hours each time</span>
              <input className="input" inputMode="decimal" value={setup.accrual || ''} placeholder="0" onChange={(event) => set({ accrual: number(event.target.value) })} />
            </label>
            <label className="field">
              <span className="field__label">Next added on</span>
              <input className="input" type="date" value={setup.from} onChange={(event) => event.target.value && set({ from: event.target.value })} />
            </label>
          </div>
        )}
        {setup.every !== 'none' && (
          <label className="field">
            <span className="field__label">Most it can hold</span>
            <input className="input" inputMode="decimal" value={setup.cap ?? ''} placeholder="No cap" onChange={(event) => set({ cap: event.target.value.trim() ? number(event.target.value) : undefined })} />
          </label>
        )}
      </section>

      <p className="ll-section-label">A day off</p>
      <section className="card">
        <p className="muted">Used on days with no shift in Proairetos.</p>
        <label className="field">
          <span className="field__label">Hours in a usual day</span>
          <input className="input" inputMode="decimal" value={setup.dayHours || ''} placeholder="8" onChange={(event) => set({ dayHours: number(event.target.value) || 8 })} />
        </label>
        <p className="label">Work days (none: every day)</p>
        <div className="chip-row" role="group" aria-label="Days you usually work">
          {WEEKDAYS.map((name, day) => (
            <button key={name} type="button" className="chip" aria-pressed={setup.workDays.includes(day)} onClick={() => set({ workDays: setup.workDays.includes(day) ? setup.workDays.filter((each) => each !== day) : [...setup.workDays, day].sort() })}>
              {name}
            </button>
          ))}
        </div>
      </section>

      <p className="ll-section-label">A full week off</p>
      <section className="card">
        <label className="field">
          <span className="field__label">Hours a full week takes</span>
          <input
            className="input"
            inputMode="decimal"
            value={setup.weekHours ?? ''}
            placeholder={String(fullWeekHours({ ...setup, weekHours: undefined }))}
            onChange={(event) => set({ weekHours: event.target.value.trim() ? number(event.target.value) : undefined })}
          />
        </label>
        <p className="fine">Holidays at home aren’t counted.</p>
      </section>

      <button
        type="button"
        className="button-main"
        onClick={() => {
          settings.save({ ...settings.load(), timeOff: setup });
          void recountPlanned();
          nav.back();
        }}
      >
        Save
      </button>
    </div>
  );
}
