import { useEffect, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackLink, Segmented } from '../../askesis/app/ui';
import { Waiting } from '../../lamplight/Waiting';
import type { PoreiaNav } from '../app/App';
import { countHours, removeTimeOff, saveTimeOff } from '../app/proairetos';
import { newId, nowStamp, settings, setupOrDefault, timeOff, today, trips } from '../app/state';
import { daysBetween } from '../../core/scheduling/dates';
import { fullWeekHours, hoursText, leftAfter, type TimeOff, type TimeOffStatus } from '../core/timeOff';
import { HolidaysLine } from '../components/References';
import type { Holiday } from '../app/world';
import DateRange from '../components/DateRange';

const STATUSES: { id: Exclude<TimeOffStatus, 'canceled'>; label: string }[] = [
  { id: 'planned', label: 'Planned' },
  { id: 'requested', label: 'Requested' },
  { id: 'approved', label: 'Approved' },
];

/** One stretch of time off: dates, the hours they take from work, and where the request stands. */
export default function TimeOffForm({ nav, id, tripId }: { nav: PoreiaNav; id?: string; tripId?: string }) {
  const existing = id ? timeOff.get(id) : undefined;
  const allTrips = trips.use();
  const linkedTrip = allTrips.find((trip) => trip.id === (existing?.tripId ?? tripId));
  const setup = settings.use().timeOff;
  const [title, setTitle] = useState(existing?.title ?? linkedTrip?.name ?? '');
  const [start, setStart] = useState(existing?.start ?? linkedTrip?.start ?? today());
  const [end, setEnd] = useState(existing?.end ?? linkedTrip?.end ?? linkedTrip?.start ?? today());
  const [status, setStatus] = useState<TimeOffStatus>(existing?.status === 'canceled' ? 'planned' : (existing?.status ?? 'planned'));
  const [trip, setTrip] = useState(existing?.tripId ?? tripId ?? '');
  const [hoursSet, setHoursSet] = useState(existing?.hoursSet ?? false);
  const [hours, setHours] = useState(existing?.hours ?? 0);
  const [counted, setCounted] = useState<{ hours: number; hasSchedule: boolean; shifts: number; holidays: Holiday[] }>();
  const [busy, setBusy] = useState(false);
  const approvedAlready = existing?.status === 'approved' && existing.start === start && existing.end === end;

  useEffect(() => {
    if (end < start || approvedAlready) return;
    let live = true;
    void countHours(start, end).then((result) => live && setCounted({ hours: result.hours, hasSchedule: result.hasSchedule, shifts: result.shifts.length, holidays: result.holidays }));
    return () => {
      live = false;
    };
  }, [start, end, approvedAlready]);

  const span = end >= start ? daysBetween(start, end) + 1 : 0;
  const weeks = Math.floor(span / 7);
  const spare = span - weeks * 7;
  const shown = hoursSet ? hours : approvedAlready ? existing!.hours : (counted?.hours ?? existing?.hours ?? 0);
  const left = setup && end >= start ? leftAfter(setup, timeOff.list(), { id: existing?.id ?? 'new', start, hours: shown }) : undefined;

  const save = async () => {
    if (end < start) return;
    setBusy(true);
    const now = nowStamp();
    const record: TimeOff = {
      id: existing?.id ?? newId(),
      tripId: trip || undefined,
      title: title.trim() || 'Time off',
      start,
      end,
      status,
      hours: shown,
      hoursSet: hoursSet || undefined,
      replaced: existing?.replaced,
      note: existing?.note,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const saved = await saveTimeOff(record, existing);
    setBusy(false);
    const replaced = saved.replaced?.length ?? 0;
    if (status === 'approved' && replaced && !existing?.replaced?.length) offerUndo(`${replaced} ${replaced === 1 ? 'shift' : 'shifts'} off your Proairetos schedule`, () => void saveTimeOff({ ...saved, status: existing?.status ?? 'planned' }, saved));
    nav.back();
  };

  return (
    <div className="page poreia-page">
      <BackLink label="Time off" onBack={nav.back} />
      <h1 className="title">{existing ? existing.title : 'New time off'}</h1>
      <label className="field">
        <span className="field__label">Name</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <DateRange
        start={start}
        end={end}
        startLabel="First day off"
        endLabel="Last day off"
        empty="Pick a day"
        clearable={false}
        count="days"
        onChange={(dates) => {
          if (dates.start) setStart(dates.start);
          if (dates.end) setEnd(dates.end);
        }}
      />

      <section className="card">
        <p className="label">Hours it takes</p>
        {hoursSet ? (
          <label className="field">
            <span className="field__label">Hours</span>
            <input className="input" inputMode="decimal" value={hours || ''} onChange={(event) => setHours(Number(event.target.value.replace(',', '.')) || 0)} />
          </label>
        ) : (
          <p className="poreia-balance__hours">{counted || approvedAlready ? hoursText(shown) : <Waiting>Counting…</Waiting>}</p>
        )}
        {!hoursSet && counted && !approvedAlready && (
          <>
            <p className="muted">{countedText(weeks, spare, counted, setup?.dayHours ?? 8, Boolean(setup?.workDays.length))}</p>
            {counted.holidays.length > 0 && <HolidaysLine days={counted.holidays} />}
          </>
        )}
        <button
          type="button"
          className="text-link"
          onClick={() => {
            if (!hoursSet) setHours(shown);
            setHoursSet(!hoursSet);
          }}
        >
          {hoursSet ? 'Count from the schedule' : 'Set the hours myself'}
        </button>
        {left && <p className="muted">{hoursText(left.after)} left after it, with everything planned before it.</p>}
      </section>

      <Segmented label="Where it stands" value={status === 'canceled' ? 'planned' : status} options={STATUSES} onChange={setStatus} />
      {status === 'approved' && !approvedAlready && <p className="fine">Saving clears these days’ shifts in Proairetos.</p>}

      {allTrips.length > 0 && (
        <label className="field">
          <span className="field__label">For a trip</span>
          <select className="input" value={trip} onChange={(event) => setTrip(event.target.value)}>
            <option value="">None</option>
            {allTrips.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="button" className="button-main" disabled={busy || end < start} onClick={() => void save()}>
        {busy ? <Waiting>Saving…</Waiting> : 'Save'}
      </button>
      {existing && existing.status !== 'canceled' && (
        <button
          type="button"
          className="button-quiet"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const saved = await saveTimeOff({ ...existing, status: 'canceled' }, existing);
            setBusy(false);
            offerUndo(`“${existing.title}” canceled`, () => void saveTimeOff(existing, saved));
            nav.back();
          }}
        >
          Cancel this time off
        </button>
      )}
      {existing && (
        <button
          type="button"
          className="text-link remove-link"
          onClick={async () => {
            const undo = await removeTimeOff(existing);
            offerUndo(`“${existing.title}” deleted`, () => void undo());
            nav.back();
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}

/** How the hours were counted: whole weeks as a full week off, other days from shifts or the usual day. */
function countedText(weeks: number, spare: number, counted: { hasSchedule: boolean; shifts: number }, dayHours: number, workDaysChosen: boolean): string {
  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks} full ${weeks === 1 ? 'week' : 'weeks'} at ${hoursText(fullWeekHours(setupOrDefault()))} each`);
  if (spare > 0 || weeks === 0) {
    const where = weeks > 0 ? 'the other days' : 'these days';
    parts.push(counted.hasSchedule ? `work shifts in Proairetos on ${where}` : `${dayHours} h for each ${workDaysChosen ? 'work day' : 'day'} on ${where}`);
  }
  const line = parts.join(', then ');
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`;
}
