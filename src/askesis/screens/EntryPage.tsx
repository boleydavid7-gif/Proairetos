import { useEffect, useState } from 'react';
import type { Nav, Route } from '../app/App';
import { FeltFace } from '../app/icons';
import { newId, useEntries, usePlanState, useSettings, useToday } from '../app/state';
import { asToday } from '../core/gentler';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { mondayOnOrBefore } from '../../core/scheduling/dates';
import { layOut } from '../core/week';
import { activities, feelings, type Activity, type Felt, type LogEntry } from '../core/log';
import { formatPace, inUnit, METERS, paceOf, parseDistance, type Unit } from '../core/pace';
import { weekAt, type Plan } from '../core/plans';
import { tap } from '../../app/feel';
import { deleteEntry, putEntry } from '../data/store';
import { locate } from './WorkoutPage';

const digits = (text: string) => text.replace(/[^\d]/g, '').slice(0, 2);

/**
 * Logging a workout by hand: from a watch, or from memory. Only the date is
 * needed; everything else can be left blank. Opening an earlier entry edits it.
 */
export default function EntryPage({ nav, route, plan }: { nav: Nav; route: Extract<Route, { name: 'entry' }>; plan?: Plan }) {
  const settings = useSettings();
  const today = useToday();
  const entries = useEntries();
  const undo = useUndo();
  const existing = route.id ? entries?.find((entry) => entry.id === route.id) : undefined;
  const planState = usePlanState();
  const located = route.workoutId ? locate(route.workoutId, plan) : undefined;
  const session = located && { ...located, workout: asToday(located.workout, planState?.lighter, today) };

  const [activity, setActivity] = useState<Activity>('run');
  const [date, setDate] = useState(route.date ?? today);
  const [unit, setUnit] = useState<Unit>(settings.unit);
  const [distance, setDistance] = useState('');
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');
  const [hr, setHr] = useState('');
  const [felt, setFelt] = useState<Felt>();
  const [notes, setNotes] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    if (route.id && !existing) return;
    const seconds = existing?.seconds ?? route.seconds;
    if (seconds) {
      setH(seconds >= 3600 ? String(Math.floor(seconds / 3600)) : '');
      setM(String(Math.floor((seconds % 3600) / 60)));
      setS(String(Math.round(seconds % 60)).padStart(2, '0'));
    }
    if (existing) {
      setActivity(existing.activity);
      setDate(existing.date);
      if (existing.meters) setDistance(inUnit(existing.meters, unit).toFixed(2).replace(/\.?0+$/, ''));
      if (existing.avgHr) setHr(String(existing.avgHr));
      setFelt(existing.felt);
      setNotes(existing.notes ?? '');
      setWentWell(existing.wentWell ?? '');
      setNextTime(existing.nextTime ?? '');
    } else if (session?.workout.kind === 'walk') setActivity('walk');
    setLoaded(true);
  }, [existing, loaded]);

  const seconds = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
  const meters = parseDistance(distance, unit);
  const pace = meters && seconds ? paceOf(seconds, meters, unit) : undefined;
  // Logged from the Log tab on a day with a session still open: offer to count it as that session.
  const [linkOpen, setLinkOpen] = useState(true);
  const open =
    !existing && !route.workoutId && plan && planState && entries && mondayOnOrBefore(date) === mondayOnOrBefore(today)
      ? layOut(
          weekAt(plan, planState.week),
          today,
          planState.weekdays,
          planState.moves,
          entries.filter((entry) => entry.date >= mondayOnOrBefore(today)),
        ).find((day) => day.date === date && !day.done)
      : undefined;
  const openWorkout = open && asToday(open.workout, planState?.lighter, today);
  const linked = openWorkout && linkOpen ? openWorkout : undefined;
  const title = existing?.workoutTitle ?? session?.workout.title ?? linked?.title;

  const switchUnit = (next: Unit) => {
    if (meters) setDistance((meters / METERS[next]).toFixed(2).replace(/\.?0+$/, ''));
    setUnit(next);
  };

  const save = async () => {
    const entry: LogEntry = {
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      date: date || today,
      activity,
      seconds: seconds || undefined,
      meters,
      avgHr: Number(hr) > 30 && Number(hr) < 240 ? Math.round(Number(hr)) : undefined,
      felt,
      notes: notes.trim() || undefined,
      wentWell: wentWell.trim() || undefined,
      nextTime: nextTime.trim() || undefined,
      intention: existing?.intention ?? route.intention,
      workoutId: existing?.workoutId ?? route.workoutId ?? linked?.id,
      workoutTitle: title,
    };
    await putEntry(entry);
    tap();
    nav.swap(existing ? { name: 'log' } : { name: 'after', id: entry.id });
  };

  const remove = async () => {
    if (!existing) return;
    await deleteEntry(existing.id);
    undo('Workout removed', () => void putEntry(existing));
    nav.back();
  };

  return (
    <div className="page entry">
      <BackLink label="Back" onBack={nav.back} />
      <h1 className="title">{existing ? 'Your workout' : 'Log workout'}</h1>
      {title && !openWorkout && <p className="muted">{title}</p>}
      {openWorkout && (
        <div className="card switches">
          <Switch
            on={linkOpen}
            label={`This is ${dayWord(date, today)}’s ${openWorkout.title.toLowerCase()}`}
            onToggle={() => setLinkOpen(!linkOpen)}
          />
        </div>
      )}

      <Segmented
        label="Activity"
        value={activity}
        options={(Object.keys(activities) as Activity[]).map((id) => ({ id, label: activities[id] }))}
        onChange={setActivity}
        small
      />

      <label className="field">
        <span className="label">Date</span>
        <input className="input" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
      </label>

      <div className="field">
        <label className="label" htmlFor="distance">
          Distance
        </label>
        <div className="input-row">
          <input
            id="distance"
            className="input"
            inputMode="decimal"
            placeholder="e.g. 5"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          />
          <Segmented
            label="Unit"
            value={unit}
            options={[
              { id: 'mi', label: 'mi' },
              { id: 'km', label: 'km' },
            ]}
            onChange={switchUnit}
            small
          />
        </div>
      </div>

      <fieldset className="field time-field">
        <legend className="label">Time</legend>
        <div className="time-boxes">
          <input className="input" inputMode="numeric" aria-label="Hours" placeholder="00" value={h} onChange={(event) => setH(digits(event.target.value))} />
          <span aria-hidden="true">:</span>
          <input className="input" inputMode="numeric" aria-label="Minutes" placeholder="MM" value={m} onChange={(event) => setM(digits(event.target.value))} />
          <span aria-hidden="true">:</span>
          <input className="input" inputMode="numeric" aria-label="Seconds" placeholder="00" value={s} onChange={(event) => setS(digits(event.target.value))} />
        </div>
        {pace && <p className="hint">Pace {formatPace(pace, unit)}</p>}
      </fieldset>

      <label className="field">
        <span className="label">Average heart rate</span>
        <input className="input" inputMode="numeric" placeholder="bpm" value={hr} onChange={(event) => setHr(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
      </label>

      <div className="field">
        <span className="label" id="felt-label">
          How did it feel?
        </span>
        <div className="faces" role="group" aria-labelledby="felt-label">
          {(Object.keys(feelings) as Felt[]).map((id) => (
            <button key={id} type="button" className="face" aria-pressed={felt === id} onClick={() => {
                tap();
                setFelt(felt === id ? undefined : id);
              }}>
              <FeltFace felt={id} />
              <span>{feelings[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="label">Notes</span>
        <textarea className="input textarea" rows={3} placeholder="Conditions, route, anything to remember" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      <details className="more-words" open={Boolean(wentWell || nextTime) || undefined}>
        <summary>A few more words, if you like</summary>
        <label className="field">
          <span className="label">What went well?</span>
          <input className="input" value={wentWell} onChange={(event) => setWentWell(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Next time</span>
          <input className="input" value={nextTime} onChange={(event) => setNextTime(event.target.value)} />
        </label>
      </details>
      {(existing?.intention ?? route.intention) && <p className="hint">Before you started: “{existing?.intention ?? route.intention}”</p>}

      <button type="button" className="button-main" onClick={() => void save()}>
        Save workout
      </button>
      {existing && (
        <button type="button" className="button-quiet" onClick={() => void remove()}>
          Remove this workout
        </button>
      )}
    </div>
  );
}

function dayWord(date: string, today: string): string {
  if (date === today) return 'today';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
}
