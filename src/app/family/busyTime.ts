import { beforeQuiet, sleepTaken } from '../../core/training/clash';
import { planBetween } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { itemSpan, type Span } from '../../core/rhythm/openTime';
import { addDays, atTime } from '../../core/scheduling/dates';
import type { LifeItem } from '../../core/life-items/types';
import { loadQuietHours } from '../../data/storage/preferences';
import { otherCalendars } from '../calendars/otherCalendars';
import { calendarStore } from '../providers/calendar';
import { eventsFromLines } from '../providers/calendarView';
import { philiaCalendar } from '../calendars/philiaCalendar';
import { therapeiaCalendar } from '../calendars/therapeiaCalendar';
import { scheduleService } from '../services';
import { isAdded } from './added';

/*
 * What holds time on a day, read from Proairetos: work and protected time, other calendars, timed things, sleep. The
 * training offers and Meletē's Week both find their open stretches from it.
 */

/**
 * Sleep kept clear on a date: Diaita's planned sleep (from an hour before bed) and wind-down, its naps only when the
 * person chose that in Diaita; without Diaita, the hour before quiet hours.
 */
function sleepOn(date: string, blocks: readonly { start: Date; end: Date; kind: 'COMMITTED' | 'PROTECTED'; label?: string; patternName: string }[]): Span[] {
  const diaita = diaitaSettings.load();
  if (!isAdded('diaita') || !diaita.started) return beforeQuiet(date, loadQuietHours());
  const plan = planBetween(addDays(date, -1), addDays(date, 1), blocks.map((block) => ({ start: block.start, end: block.end, kind: block.kind, label: block.label || block.patternName })), diaita);
  return sleepTaken(plan, Boolean(diaita.trainingClearOfNaps));
}

/** The apps whose timed entries hold time (a trip's bookings never did). */
const BUSY_APPS = ['philia', 'therapeia', 'melete'];

/** Everything else holding time on a date: work and protected time, other calendars, timed things in Proairetos, sleep. */
export async function busyOn(date: string, items: readonly LifeItem[], leaveOut?: string): Promise<Span[]> {
  const from = atTime(date, '00:00');
  const until = atTime(addDays(date, 1), '00:00');
  const blocks = await scheduleService.occurrencesBetween(new Date(from.getTime() - 2 * 86_400_000), atTime(addDays(date, 2), '00:00'));
  const events = [...otherCalendars.eventsBetween(from, until), ...(await philiaCalendar.eventsBetween(from, until)), ...(await therapeiaCalendar.eventsBetween(from, until)), ...eventsFromLines(await calendarStore.lines({ from, until }), (app) => BUSY_APPS.includes(app))].filter((event) => !event.allDay);
  const timed = items
    .filter((item) => item.id !== leaveOut && item.scheduledAt && item.status !== 'DONE' && !item.repeat)
    .map((item) => itemSpan(item.scheduledAt!, item.endsAt));
  return [...blocks, ...events, ...timed, ...sleepOn(date, blocks)].map((span) => ({ start: span.start, end: span.end })).filter((span) => span.end > from && span.start < until);
}

