import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, ChevronIcon, DiscoverIcon, PtoIcon, WorkIcon } from '../app/icons';
import { useBookings, useItineraryItems, useLeaveRequests, usePtoAccounts, usePtoLedger, useTrips, useVacations, useWorkProfiles } from '../app/state';
import { otherCalendars, type CalendarEvent as ExternalCalendarEvent } from '../../app/calendars/otherCalendars';
import { lifeService, scheduleService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';
import type { ScheduleOccurrence, SchedulePattern } from '../../core/scheduling/types';
import { addDays, balanceAt, dateDistance, dateText, findVacationWindows, parseDate, workHoursBetween, workHoursOn, type LeaveRequest, type PtoAccount, type VacationPlan, type WorkProfile } from '../core/pto';
import type { Trip } from '../core/trips';
import { newId } from '../core/id';
import { putLeaveRequest, putTrip, putVacation } from '../data/store';
import { formatDate } from '../../oikonomia/core/bills';
import { PoreiaHeader } from '../app/ui';

type CalendarEventType = 'work' | 'trip' | 'booking' | 'itinerary' | 'leave' | 'vacation' | 'holiday' | 'personal';
type CalendarView = 'month' | 'week' | 'agenda';
type AppCalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  detail: string;
  startDate: string;
  endDate: string;
  start?: Date;
  end?: Date;
  tripId?: string;
  vacationId?: string;
};

const today = () => dateText(new Date());
const monthKeyFor = (date: string) => date.slice(0, 7);
const dayLabel = (date: string) => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseDate(date));
const monthLabel = (monthKey: string) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(parseDate(`${monthKey}-01`));
const shortDateLabel = (date: string) => formatDate(date, 'short');
const timeLabel = (date: Date) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);

function monthDates(monthKey: string): string[] {
  const first = parseDate(`${monthKey}-01`);
  const start = addDays(dateText(first), -first.getDay());
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  const rows = Math.max(5, Math.ceil((first.getDay() + daysInMonth) / 7));
  return Array.from({ length: rows * 7 }, (_, index) => addDays(start, index));
}

function mondayWeek(date: string): { startDate: string; endDate: string } {
  const day = parseDate(date).getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const startDate = addDays(date, offset);
  return { startDate, endDate: addDays(startDate, 6) };
}

function dayStart(date: string): Date {
  const value = parseDate(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function overlapsDate(event: AppCalendarEvent, date: string): boolean {
  if (event.start && event.end) return event.start < dayStart(addDays(date, 1)) && event.end > dayStart(date);
  return event.startDate <= date && event.endDate >= date;
}

function eventSort(a: AppCalendarEvent, b: AppCalendarEvent): number {
  return (a.start?.getTime() ?? dayStart(a.startDate).getTime()) - (b.start?.getTime() ?? dayStart(b.startDate).getTime()) || a.title.localeCompare(b.title);
}

function eventTime(event: AppCalendarEvent): string {
  if (!event.start || !event.end) return 'All day';
  return `${timeLabel(event.start)} – ${timeLabel(event.end)}`;
}

function workHoursFromOccurrences(startDate: string, endDate: string, occurrences: readonly ScheduleOccurrence[]): number {
  return occurrences
    .filter((occurrence) => occurrence.kind === 'COMMITTED' && occurrence.date >= startDate && occurrence.date <= endDate)
    .reduce((total, occurrence) => total + Math.max(0, (occurrence.end.getTime() - occurrence.start.getTime()) / 3_600_000), 0);
}

function externalEventToApp(event: ExternalCalendarEvent): AppCalendarEvent {
  const allDayEnd = event.allDay ? dateText(new Date(event.end.getTime() - 1)) : dateText(event.start);
  return {
    id: `external:${event.sourceId}:${event.key}`,
    type: 'personal',
    title: event.title,
    detail: `${event.source}${event.location ? ` · ${event.location}` : ''}`,
    startDate: dateText(event.start),
    endDate: allDayEnd,
    start: event.allDay ? undefined : event.start,
    end: event.allDay ? undefined : event.end,
  };
}

function lifeItemToApp(item: LifeItem): AppCalendarEvent | null {
  if (item.status === 'DONE' || item.status === 'LET_GO') return null;
  if (item.scheduledAt) {
    const start = new Date(item.scheduledAt);
    if (Number.isNaN(start.getTime())) return null;
    const end = item.endsAt ? new Date(item.endsAt) : new Date(start.getTime() + 30 * 60_000);
    return { id: `life:${item.id}`, type: 'personal', title: item.title, detail: item.location || 'Proairetos', startDate: dateText(start), endDate: dateText(new Date(end.getTime() - 1)), start, end };
  }
  if (item.plannedFor) return { id: `life:${item.id}`, type: 'personal', title: item.title, detail: 'Proairetos', startDate: item.plannedFor, endDate: item.plannedFor };
  return null;
}

function CalendarLegend() {
  const entries: { type: CalendarEventType; label: string }[] = [
    { type: 'work', label: 'Work' },
    { type: 'vacation', label: 'Vacation' },
    { type: 'trip', label: 'Trip' },
    { type: 'personal', label: 'Personal' },
  ];
  return <div className="poreia-calendar-legend" aria-label="Calendar legend">{entries.map((entry) => <span key={entry.type}><i className={`poreia-calendar-dot poreia-calendar-dot--${entry.type}`} />{entry.label}</span>)}</div>;
}

function VacationPlanner({
  initialStart,
  initialEnd,
  editing,
  trips,
  profile,
  account,
  ledger,
  requests,
  occurrences,
  hasImportedSchedule,
  events,
  onClose,
  onSaved,
}: {
  initialStart: string;
  initialEnd: string;
  editing?: VacationPlan;
  trips: Trip[];
  profile?: WorkProfile;
  account?: PtoAccount;
  ledger: ReturnType<typeof usePtoLedger>;
  requests: LeaveRequest[];
  occurrences: ScheduleOccurrence[];
  hasImportedSchedule: boolean;
  events: AppCalendarEvent[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [startDate, setStartDate] = useState(editing?.startDate ?? initialStart);
  const [endDate, setEndDate] = useState(editing?.endDate ?? initialEnd);
  const [name, setName] = useState(editing?.name ?? 'Vacation');
  const [tripChoice, setTripChoice] = useState(editing?.tripId ?? '');
  const [newTripName, setNewTripName] = useState(editing?.name ?? '');
  const [finding, setFinding] = useState(false);
  const [suggestions, setSuggestions] = useState<{ startDate: string; endDate: string; ptoRequired: number; reason: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setStartDate(editing?.startDate ?? initialStart);
    setEndDate(editing?.endDate ?? initialEnd);
    setName(editing?.name ?? 'Vacation');
    setTripChoice(editing?.tripId ?? '');
    setNewTripName(editing?.name ?? '');
    setMessage('');
    setError('');
  }, [editing, initialEnd, initialStart]);

  const validRange = Boolean(startDate && endDate && endDate >= startDate);
  const selectedWork = useMemo(() => occurrences.filter((occurrence) => occurrence.kind === 'COMMITTED' && occurrence.date >= startDate && occurrence.date <= endDate).sort((a, b) => a.start.getTime() - b.start.getTime()), [endDate, occurrences, startDate]);
  const ptoRequired = hasImportedSchedule ? workHoursFromOccurrences(startDate, endDate, occurrences) : profile ? workHoursBetween(startDate, endDate, profile) : 0;
  const available = account && profile ? balanceAt(account, ledger, profile, endDate, requests) : undefined;
  const projected = available === undefined ? undefined : Math.max(0, available - ptoRequired);
  const conflicts = events.filter((event) => !['work', 'vacation', 'holiday'].includes(event.type) && event.startDate <= endDate && event.endDate >= startDate).sort(eventSort);

  const useWeek = () => {
    const range = mondayWeek(startDate || initialStart);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const findBetterDates = () => {
    if (!account || !profile || !validRange) return;
    setFinding(true);
    const durationDays = dateDistance(startDate, endDate) + 1;
    const windows = findVacationWindows(account, profile, ledger, requests, { from: today(), until: addDays(today(), 120), durationDays });
    setSuggestions(windows.slice(0, 3).map((window) => ({ startDate: window.startDate, endDate: window.endDate, ptoRequired: window.ptoRequired, reason: window.reason })));
    setFinding(false);
  };

  const save = async () => {
    setError('');
    setMessage('');
    if (!validRange) return setError('Choose an end date on or after the first day.');
    if (!name.trim()) return setError('Give this vacation a name.');
    setSaving(true);
    const now = new Date().toISOString();
    const vacationId = editing?.id ?? newId();
    let tripId = tripChoice || undefined;
    try {
      if (tripChoice === 'new') {
        const trip: Trip = { id: newId(), name: newTripName.trim() || name.trim(), startDate, endDate, status: 'planning', travelers: [], createdAt: now, updatedAt: now };
        await putTrip(trip);
        tripId = trip.id;
      } else if (tripId) {
        const linkedTrip = trips.find((trip) => trip.id === tripId);
        if (linkedTrip && (linkedTrip.startDate !== startDate || linkedTrip.endDate !== endDate)) await putTrip({ ...linkedTrip, startDate, endDate, updatedAt: now });
      }
      const leaveRequestId = editing?.leaveRequestId ?? `vacation:${vacationId}:leave`;
      if (account) {
        await putLeaveRequest({ id: leaveRequestId, accountId: account.id, vacationId, startDate, endDate, requestedAmount: ptoRequired, status: 'requested', note: name.trim(), createdAt: editing ? requests.find((request) => request.id === leaveRequestId)?.createdAt ?? now : now, updatedAt: now });
      }
      const linkedAccountId = account?.id ?? editing?.ptoAccountId;
      const plan: VacationPlan = { id: vacationId, name: name.trim(), startDate, endDate, status: 'planned', ptoRequired, ...(linkedAccountId ? { ptoAccountId: linkedAccountId, leaveRequestId } : {}), ...(tripId ? { tripId } : {}), calendarSync: 'pending', createdAt: editing?.createdAt ?? now, updatedAt: now };
      await putVacation(plan);
      await putVacation({ ...plan, calendarSync: 'synced', updatedAt: new Date().toISOString() });
      setMessage('Saved in Poreia and shared with the Proairetos calendar.');
      onSaved('Vacation saved in both calendars.');
    } catch {
      try { await putVacation({ id: vacationId, name: name.trim(), startDate, endDate, status: 'planned', ptoRequired, calendarSync: 'error', syncError: 'The calendar update needs another try.', createdAt: editing?.createdAt ?? now, updatedAt: new Date().toISOString() }); } catch { /* Keep the visible error when storage is unavailable. */ }
      setError('The vacation could not be saved completely. Your dates were kept for another try.');
    } finally {
      setSaving(false);
    }
  };

  const cancelVacation = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await putVacation({ ...editing, status: 'canceled', calendarSync: 'synced', updatedAt: new Date().toISOString() });
      if (editing.leaveRequestId) {
        const request = requests.find((item) => item.id === editing.leaveRequestId);
        if (request) await putLeaveRequest({ ...request, status: 'canceled', updatedAt: new Date().toISOString() });
      }
      onSaved('Vacation canceled and any PTO request was released.');
    } catch {
      setError('That vacation could not be canceled. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="card poreia-card poreia-vacation-planner" aria-label="Vacation planner"><div className="poreia-section-head"><div><p className="label">{editing ? 'Update vacation' : 'Vacation dates'}</p><h2>Review time away</h2></div><button type="button" className="text-link" onClick={onClose}>Close</button></div><div className="poreia-form__pair"><label className="field"><span className="field__label">First day</span><input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span className="field__label">Last day</span><input className="input" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><div className="button-row"><button type="button" className="button-quiet" onClick={useWeek}>Use this week</button><button type="button" className="button-quiet" onClick={findBetterDates} disabled={!account || !profile || finding}>{finding ? 'Finding…' : 'Find better dates'}</button></div><label className="field"><span className="field__label">Vacation name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="A week away" /></label><label className="field"><span className="field__label">Link to a trip</span><select className="input" value={tripChoice} onChange={(event) => setTripChoice(event.target.value)}><option value="">No trip yet</option><option value="new">Create a new trip</option>{trips.filter((trip) => trip.status !== 'canceled').map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>{tripChoice === 'new' && <label className="field"><span className="field__label">New trip name</span><input className="input" value={newTripName} onChange={(event) => setNewTripName(event.target.value)} placeholder="Summer in Maine" /></label>}<div className="poreia-vacation-review"><div><span className="field__label">Scheduled work</span><strong>{ptoRequired ? `${ptoRequired} hours` : 'No scheduled work found'}</strong><small>{selectedWork.length ? `${selectedWork.length} shift${selectedWork.length === 1 ? '' : 's'} in this range` : ptoRequired ? `${ptoRequired} hours from your manual schedule.` : profile ? 'Your manual schedule has no working days here.' : 'Connect or set up a schedule to estimate leave.'}</small></div><div><span className="field__label">PTO after this plan</span><strong>{projected === undefined ? 'Set up optional PTO' : `${projected} hours projected`}</strong><small>{available === undefined ? 'Planning dates will not deduct PTO.' : `${available} hours available now`}</small></div></div>{conflicts.length > 0 && <div className="poreia-vacation-conflicts"><strong>{conflicts.length} existing commitment{conflicts.length === 1 ? '' : 's'} in this range</strong>{conflicts.slice(0, 3).map((event) => <span key={event.id}>{event.title} · {shortDateLabel(event.startDate)}</span>)}</div>}{suggestions.length > 0 && <div className="poreia-list poreia-vacation-suggestions"><span className="field__label">Possible alternatives</span>{suggestions.map((suggestion) => <button type="button" className="poreia-row poreia-row--button" key={suggestion.startDate} onClick={() => { setStartDate(suggestion.startDate); setEndDate(suggestion.endDate); }}><span className="poreia-row__text"><strong>{shortDateLabel(suggestion.startDate)} – {shortDateLabel(suggestion.endDate)}</strong><small>{suggestion.ptoRequired} hours · {suggestion.reason}</small></span><ChevronIcon size={18} /></button>)}</div>}{!profile && <p className="hint">Poreia can save the vacation now. Configure a work schedule and leave account later to calculate PTO, or use the Proairetos schedule when it is available.</p>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<div className="button-row"><button type="button" className="button-main" onClick={() => void save()} disabled={saving || !validRange}>{saving ? 'Saving…' : editing ? 'Update vacation' : 'Confirm vacation'}</button>{editing && <button type="button" className="button-quiet" onClick={() => void cancelVacation()} disabled={saving}>Cancel vacation</button>}</div></section>;
}

export default function CalendarPage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const accounts = usePtoAccounts();
  const ledger = usePtoLedger();
  const requests = useLeaveRequests();
  const vacations = useVacations();
  const trips = useTrips();
  const itineraryItems = useItineraryItems();
  const bookings = useBookings();
  const profile = profiles[0];
  const account = accounts.find((item) => item.workProfileId === profile?.id) ?? accounts[0];
  const current = today();
  const [monthKey, setMonthKey] = useState(monthKeyFor(current));
  const [selectedDate, setSelectedDate] = useState(current);
  const [view, setView] = useState<CalendarView>('month');
  const [workOccurrences, setWorkOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [schedulePatterns, setSchedulePatterns] = useState<SchedulePattern[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);
  const [lifeItems, setLifeItems] = useState<LifeItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<VacationPlan | undefined>();
  const [statusMessage, setStatusMessage] = useState('');
  const gridDates = useMemo(() => monthDates(monthKey), [monthKey]);
  const gridStart = gridDates[0];
  const gridEnd = gridDates[gridDates.length - 1];

  useEffect(() => {
    if (selectedDate < gridStart || selectedDate > gridEnd) setSelectedDate(`${monthKey}-01`);
  }, [gridEnd, gridStart, monthKey, selectedDate]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        // Include the selected week when it straddles the visible month so Week
        // view does not lose work shifts at a month boundary.
        const selectedWeek = mondayWeek(selectedDate);
        const scheduleStart = selectedWeek.startDate < gridStart ? selectedWeek.startDate : gridStart;
        const scheduleEnd = selectedWeek.endDate > gridEnd ? selectedWeek.endDate : gridEnd;
        const from = parseDate(scheduleStart);
        const until = parseDate(addDays(scheduleEnd, 1));
        const [occurrences, patterns, imported, items] = await Promise.all([scheduleService.occurrencesBetween(from, until), scheduleService.patterns(), Promise.resolve(otherCalendars.eventsBetween(from, until)), lifeService.list()]);
        if (!live) return;
        setWorkOccurrences(occurrences);
        setSchedulePatterns(patterns);
        setExternalEvents(imported);
        setLifeItems(items);
        setLoadError('');
      } catch {
        if (live) setLoadError('Some schedule information could not be loaded. Your saved Poreia records are still available.');
      }
    };
    void load();
    const offSchedule = scheduleService.subscribe(() => void load());
    const offCalendars = otherCalendars.subscribe(() => void load());
    const offLife = lifeService.subscribe(() => void load());
    return () => { live = false; offSchedule(); offCalendars(); offLife(); };
  }, [gridEnd, gridStart, selectedDate]);

  const events = useMemo(() => {
    const next: AppCalendarEvent[] = [];
    const linkedTrips = new Set(vacations.filter((vacation) => vacation.status !== 'canceled' && vacation.tripId).map((vacation) => vacation.tripId));
    if (schedulePatterns.length > 0) {
      for (const occurrence of workOccurrences) {
        const endDate = dateText(new Date(occurrence.end.getTime() - 1));
        next.push({ id: `work:${occurrence.patternId}:${occurrence.start.toISOString()}`, type: 'work', title: occurrence.label || occurrence.patternName || (occurrence.kind === 'COMMITTED' ? 'Work shift' : 'Protected time'), detail: `${occurrence.kind === 'COMMITTED' ? 'Scheduled work' : 'Protected time'} · ${eventTime({ id: '', type: 'work', title: '', detail: '', startDate: occurrence.date, endDate, start: occurrence.start, end: occurrence.end })}`, startDate: occurrence.date, endDate, start: occurrence.start, end: occurrence.end });
      }
    } else if (profile) {
      for (const date of gridDates) {
        const hours = workHoursOn(date, profile);
        if (hours) next.push({ id: `work:${date}`, type: 'work', title: 'Work schedule', detail: `${hours} scheduled work hours`, startDate: date, endDate: date });
      }
    }
    if (profile) for (const date of profile.holidays) if (date >= gridStart && date <= gridEnd) next.push({ id: `holiday:${date}`, type: 'holiday', title: 'Holiday', detail: 'Work holiday', startDate: date, endDate: date });
    for (const vacation of vacations) {
      if (vacation.status === 'canceled') continue;
      next.push({ id: `vacation:${vacation.id}`, type: 'vacation', title: vacation.name, detail: `${vacation.status[0].toUpperCase() + vacation.status.slice(1)} vacation · ${vacation.ptoRequired} PTO hours · ${vacation.calendarSync === 'synced' ? 'Shared with Proairetos' : 'Calendar sync needs attention'}`, startDate: vacation.startDate, endDate: vacation.endDate, tripId: vacation.tripId, vacationId: vacation.id });
    }
    for (const trip of trips) {
      if (trip.status === 'canceled' || linkedTrips.has(trip.id)) continue;
      const startDate = trip.startDate ?? trip.endDate;
      const endDate = trip.endDate ?? trip.startDate;
      if (startDate && endDate) next.push({ id: `trip:${trip.id}`, type: 'trip', title: trip.name, detail: `${trip.destination || 'Destination to decide'} · Trip`, startDate, endDate, tripId: trip.id });
    }
    for (const request of requests) {
      if (request.status === 'denied' || request.status === 'canceled' || request.vacationId) continue;
      next.push({ id: `leave:${request.id}`, type: 'leave', title: 'Leave request', detail: `${request.status[0].toUpperCase() + request.status.slice(1)} · ${request.requestedAmount} hours`, startDate: request.startDate, endDate: request.endDate });
    }
    for (const booking of bookings) {
      if (!booking.startDate || booking.status === 'canceled' || booking.status === 'refunded') continue;
      const start = booking.startTime ? new Date(`${booking.startDate}T${booking.startTime}`) : undefined;
      const end = start ? booking.endTime ? new Date(`${booking.endDate ?? booking.startDate}T${booking.endTime}`) : new Date(start.getTime() + 30 * 60_000) : undefined;
      if (start && end && end <= start) end.setTime(end.getTime() + 86_400_000);
      next.push({ id: `booking:${booking.id}`, type: 'booking', title: booking.provider, detail: `${booking.type.replace('-', ' ')} · ${booking.status}`, startDate: booking.startDate, endDate: booking.endDate ?? booking.startDate, ...(start && end ? { start, end } : {}), tripId: booking.tripId });
    }
    for (const item of itineraryItems) {
      if (!item.date || item.status === 'canceled') continue;
      const start = item.startTime ? new Date(`${item.date}T${item.startTime}`) : undefined;
      const end = start ? item.endTime ? new Date(`${item.date}T${item.endTime}`) : new Date(start.getTime() + 30 * 60_000) : undefined;
      if (start && end && end <= start) end.setTime(end.getTime() + 86_400_000);
      next.push({ id: `itinerary:${item.id}`, type: 'itinerary', title: item.title, detail: `${item.location || 'Itinerary'} · Trip`, startDate: item.date, endDate: item.date, ...(start && end ? { start, end } : {}), tripId: item.tripId });
    }
    next.push(...externalEvents.map(externalEventToApp));
    next.push(...lifeItems.map(lifeItemToApp).filter((event): event is AppCalendarEvent => Boolean(event)));
    return next.sort(eventSort);
  }, [bookings, externalEvents, gridDates, gridEnd, gridStart, itineraryItems, lifeItems, profile, requests, schedulePatterns.length, trips, vacations, workOccurrences]);

  const selectedEvents = useMemo(() => events.filter((event) => overlapsDate(event, selectedDate)).sort(eventSort), [events, selectedDate]);
  const eventDates = useMemo(() => new Map(gridDates.map((date) => [date, events.filter((event) => overlapsDate(event, date))])), [events, gridDates]);
  const weekRange = useMemo(() => mondayWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekRange.startDate, index)), [weekRange.startDate]);
  const agendaDates = useMemo(() => gridDates.filter((date) => date.startsWith(monthKey) && (eventDates.get(date)?.length ?? 0) > 0), [eventDates, gridDates, monthKey]);
  const goMonth = (offset: number) => {
    const currentMonth = parseDate(`${monthKey}-01`);
    currentMonth.setMonth(currentMonth.getMonth() + offset);
    const nextMonth = monthKeyFor(dateText(currentMonth));
    setMonthKey(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  };
  const goToday = () => { setMonthKey(monthKeyFor(current)); setSelectedDate(current); };
  const goPeriod = (offset: number) => {
    if (view === 'week') {
      const next = addDays(selectedDate, offset * 7);
      setSelectedDate(next);
      setMonthKey(monthKeyFor(next));
      return;
    }
    goMonth(offset);
  };
  const openPlanner = (vacation?: VacationPlan) => { setEditingVacation(vacation); setPlannerOpen(true); };
  const onSaved = (message: string) => { setPlannerOpen(false); setEditingVacation(undefined); setStatusMessage(message); };
  const openEvent = (event: AppCalendarEvent) => { if (event.vacationId) openPlanner(vacations.find((vacation) => vacation.id === event.vacationId)); else if (event.tripId) nav.go({ name: 'trip', id: event.tripId }); };
  const eventRow = (event: AppCalendarEvent) => <button type="button" className="poreia-row poreia-row--button poreia-calendar-event-row" key={event.id} onClick={() => openEvent(event)}><span className={`poreia-calendar-event__marker poreia-calendar-event__marker--${event.type}`} /><span className="poreia-row__text"><strong>{event.title}</strong><small>{eventTime(event)} · {event.detail}</small></span><ChevronIcon size={18} /></button>;

  return <div className="page poreia-page poreia-calendar-shell"><PoreiaHeader compact noTitleAnchor eyebrow="Travel and commitments" title="Calendar" description="Plan your time away."><div className="poreia-calendar-header-actions"><button type="button" className="button-quiet" onClick={goToday}>Today</button><button type="button" className="button-quiet" onClick={() => nav.go({ name: 'vacation' })}><PtoIcon size={18} /> Vacation Time</button></div></PoreiaHeader>
    <div className="page page--under-hero poreia-calendar-page">
      {statusMessage && <p className="form-success" role="status">{statusMessage}</p>}
      <div className="poreia-calendar-view-tabs" role="tablist" aria-label="Calendar view">{(['month', 'week', 'agenda'] as CalendarView[]).map((item) => <button type="button" role="tab" aria-selected={view === item} key={item} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      <section className="poreia-calendar-toolbar" aria-label="Calendar controls"><button type="button" className="poreia-icon-button" aria-label={view === 'week' ? 'Previous week' : 'Previous month'} onClick={() => goPeriod(-1)}><ChevronIcon size={20} /></button><h2>{view === 'week' ? `${shortDateLabel(weekRange.startDate)} – ${shortDateLabel(weekRange.endDate)}` : monthLabel(monthKey)}</h2><div className="poreia-calendar-toolbar__actions"><button type="button" className="text-link" onClick={goToday}>Today</button><button type="button" className="poreia-icon-button" aria-label={view === 'week' ? 'Next week' : 'Next month'} onClick={() => goPeriod(1)}><ChevronIcon size={20} /></button></div></section>
      {view === 'month' && <section className="poreia-calendar-grid" aria-label={monthLabel(monthKey)}><div className="poreia-calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="poreia-calendar-days">{gridDates.map((date) => { const dayEvents = eventDates.get(date) ?? []; const inMonth = date.startsWith(monthKey); const selected = date === selectedDate; const isToday = date === current; return <button type="button" className={`poreia-calendar-day${inMonth ? '' : ' poreia-calendar-day--outside'}${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`} key={date} aria-label={`${dayLabel(date)}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`} aria-pressed={selected} onClick={() => setSelectedDate(date)}><strong>{parseDate(date).getDate()}</strong>{dayEvents.length > 0 && <span className="poreia-calendar-day__dots" aria-hidden="true">{[...new Set(dayEvents.map((event) => event.type))].slice(0, 3).map((type) => <i className={`poreia-calendar-dot poreia-calendar-dot--${type}`} key={type} />)}</span>}</button>; })}</div></section>}
      {view === 'week' && <section className="poreia-calendar-week-view" aria-label="Week view">{weekDates.map((date) => { const dayEvents = events.filter((event) => overlapsDate(event, date)).sort(eventSort); return <div className={`poreia-calendar-week-day${date === selectedDate ? ' is-selected' : ''}`} key={date}><button type="button" className="poreia-calendar-week-day__head" onClick={() => setSelectedDate(date)}><strong>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parseDate(date))}</strong><span>{parseDate(date).getDate()}</span></button>{dayEvents.length ? <div className="poreia-list">{dayEvents.slice(0, 4).map(eventRow)}</div> : <p className="muted">No plans</p>}</div>; })}</section>}
      {view === 'agenda' && <section className="poreia-calendar-agenda-view" aria-label="Agenda view">{agendaDates.length ? agendaDates.map((date) => <section className="poreia-section" key={date}><div className="poreia-section-head"><h2>{dayLabel(date)}</h2><span className="label">{eventDates.get(date)?.length ?? 0}</span></div><div className="poreia-list">{(eventDates.get(date) ?? []).sort(eventSort).map(eventRow)}</div></section>) : <div className="card poreia-empty"><CalendarIcon size={28} /><h2 className="card__title">Nothing on the calendar yet</h2><p className="muted">Connect your Proairetos calendar to see work shifts and vacation windows, or add a trip.</p><div className="button-row"><button type="button" className="button-main" onClick={() => nav.swap({ name: 'trips' })}>Plan a trip</button><button type="button" className="button-quiet" onClick={() => openPlanner()}>Choose vacation dates</button></div></div>}</section>}
      <CalendarLegend />
      {view !== 'agenda' && <section className="poreia-section poreia-calendar-agenda"><div className="poreia-section-head"><div><p className="label">Selected day</p><h2>{dayLabel(selectedDate)}</h2></div><span className="label">{selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}</span></div>{selectedEvents.length === 0 ? <div className="card poreia-empty"><CalendarIcon size={28} /><p className="muted">No plans for this day yet.</p><div className="button-row"><button type="button" className="button-main" onClick={() => openPlanner()}>Plan vacation</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'trips' })}>Plan a trip</button></div></div> : <div className="poreia-list">{selectedEvents.map(eventRow)}</div>}</section>}
      <section className="poreia-section poreia-calendar-actions"><div className="poreia-section-head"><h2>Make the dates work</h2></div><div className="poreia-action-grid"><button type="button" className="poreia-action-tile" onClick={() => openPlanner()}><CalendarIcon size={22} /><span><strong>Choose vacation dates</strong><small>Review work shifts and PTO first</small></span></button><button type="button" className="poreia-action-tile" onClick={() => nav.swap({ name: 'trips' })}><DiscoverIcon size={22} /><span><strong>Continue a trip</strong><small>Connect dates to a travel plan</small></span></button></div></section>
      {schedulePatterns.length === 0 && !profile && <section className="card poreia-sync-note"><WorkIcon size={22} /><div><strong>Make your vacation dates work for you</strong><p>Connect your Proairetos calendar to see work shifts and find vacation windows that fit your schedule.</p></div><button type="button" className="button-quiet" onClick={() => nav.go({ name: 'vacation' })}>Connect calendar</button></section>}
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
    </div>
    {plannerOpen && <div className="poreia-page__overlay"><VacationPlanner initialStart={selectedDate} initialEnd={selectedDate} editing={editingVacation} trips={trips} profile={profile} account={account} ledger={ledger} requests={requests} occurrences={workOccurrences} hasImportedSchedule={schedulePatterns.length > 0} events={events} onClose={() => { setPlannerOpen(false); setEditingVacation(undefined); }} onSaved={onSaved} /></div>}
  </div>;
}
