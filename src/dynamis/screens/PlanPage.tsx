import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { DynamisNav } from '../app/App';
import { isSetup, plan, savePlan } from '../app/state';
import { AIM_NAMES, newSetup, sessionsFor, type Aim, type Unit } from '../core/plan';
import type { Place } from '../core/library';
import { setWorkDayChoice, WORK_DAY_CHOICES, workDayChoice } from '../../app/family/trainingWeek';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLACES: { id: Place; label: string }[] = [
  { id: 'gym', label: 'A gym' },
  { id: 'home', label: 'Home, with dumbbells' },
  { id: 'body', label: 'No equipment' },
];
const usesPounds = () => /^en-(US|LR|MM)/.test(navigator.language);

export default function PlanPage({ nav }: { nav: DynamisNav }) {
  const before = plan.load();
  const existing = isSetup(before) ? before : undefined;
  const [aim, setAim] = useState<Aim>(existing?.aim ?? 'health');
  const [place, setPlace] = useState<Place>(existing?.place ?? 'gym');
  const [isNew, setIsNew] = useState(existing?.isNew ?? true);
  const [days, setDays] = useState<number[]>(existing?.days ?? [1, 4]);
  const [fit, setFit] = useState(Boolean(existing?.fit));
  const [workDays, setWorkDays] = useState(workDayChoice);
  const [unit, setUnit] = useState<Unit>(existing?.unit ?? (usesPounds() ? 'lb' : 'kg'));
  const valid = days.length >= 2;

  const save = () => {
    const today = toLocalDate(new Date());
    const next = existing
      ? { ...existing, aim, place, isNew, days: [...days].sort(), unit, fit: fit || undefined, ...(existing.place !== place ? { swaps: undefined } : {}) }
      : { ...newSetup({ aim, place, isNew, days: [...days].sort(), unit }, today), fit: fit || undefined };
    savePlan(next);
    if (existing) offerUndo('Plan changed', () => savePlan(existing));
    nav.swap({ name: 'today' });
  };

  return (
    <div className="page dynamis-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={() => (existing ? nav.back() : nav.swap({ name: 'today' }))}>Cancel</button>
        <p className="label">{existing ? 'Your plan' : 'Make your plan'}</p>
        <button type="button" className="text-link" disabled={!valid} onClick={save}>Save</button>
      </div>

      <fieldset className="field">
        <legend className="field__label">Aim</legend>
        <div className="chip-row" role="group" aria-label="Aim">
          {(Object.keys(AIM_NAMES) as Aim[]).map((id) => <button key={id} type="button" className="chip" aria-pressed={aim === id} onClick={() => setAim(id)}>{AIM_NAMES[id]}</button>)}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Where</legend>
        <div className="chip-row" role="group" aria-label="Where">
          {PLACES.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={place === each.id} onClick={() => setPlace(each.id)}>{each.label}</button>)}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Lifting so far</legend>
        <div className="chip-row" role="group" aria-label="Lifting so far">
          <button type="button" className="chip" aria-pressed={isNew} onClick={() => setIsNew(true)}>New to it, or back after a long time</button>
          <button type="button" className="chip" aria-pressed={!isNew} onClick={() => setIsNew(false)}>Some months or more</button>
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Days (two or more)</legend>
        <div className="weekday-row" role="group" aria-label="Days">
          {WEEK.map((day) => (
            <button key={day} type="button" className="weekday" aria-pressed={days.includes(day)} onClick={() => setDays(days.includes(day) ? days.filter((each) => each !== day) : days.length >= 4 ? days : [...days, day])}>
              {DAY[day]}
            </button>
          ))}
        </div>
        <p className="fine">{days.length >= 2 ? sessionsFor({ days }).map((session) => session.name).join(' and ') + ', in turn.' : 'Two days or more.'}</p>
        <div className="chip-row" role="group" aria-label="Training days">
          <button type="button" className="chip" aria-pressed={!fit} onClick={() => setFit(false)}>These days</button>
          <button type="button" className="chip" aria-pressed={fit} onClick={() => setFit(true)}>Around my week</button>
        </div>
        {fit && (
          <>
            <p className="fine">These days first. Sessions move when work or runs are in the way, with a day between them.</p>
            <p className="field__label">Work days</p>
            <div className="chip-row" role="group" aria-label="Work days">
              {WORK_DAY_CHOICES.map((choice) => (
                <button key={choice.id} type="button" className="chip" aria-pressed={workDays === choice.id} onClick={() => { setWorkDays(choice.id); setWorkDayChoice(choice.id); }}>
                  {choice.label}
                </button>
              ))}
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Weights in</legend>
        <div className="chip-row" role="group" aria-label="Weights in">
          {(['kg', 'lb'] as const).map((each) => <button key={each} type="button" className="chip" aria-pressed={unit === each} onClick={() => setUnit(each)}>{each}</button>)}
        </div>
      </fieldset>

      <button type="button" className="button-main" disabled={!valid} onClick={save}>{existing ? 'Save' : 'Make the plan'}</button>
    </div>
  );
}
