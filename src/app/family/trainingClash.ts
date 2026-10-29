import { readRuns } from '../askesis/runs';
import { runsPlaced } from '../../askesis/app/fitted';
import { ownPath, weekAt } from '../../askesis/core/plans';
import { layOut } from '../../askesis/core/week';
import { totalMinutes } from '../../askesis/core/workouts';
import { isSetup, plan as dynamisPlan, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { isTrainingDay, nextSession, sessionMinutes, targetsFor } from '../../dynamis/core/plan';
import { beforeQuiet, crowds, sleepTaken, timesThatFit, type Session } from '../../core/training/clash';
import { planBetween } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { itemSpan, type Span } from '../../core/rhythm/openTime';
import { addDays, atTime, mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import type { LifeItem } from '../../core/life-items/types';
import { loadQuietHours } from '../../data/storage/preferences';
import { otherCalendars } from '../calendars/otherCalendars';
import { philiaCalendar } from '../calendars/philiaCalendar';
import { therapeiaCalendar } from '../calendars/therapeiaCalendar';
import { lifeService, scheduleService } from '../services';
import { isAdded } from './added';
import { fitAhead, fitWeekOf, liftDays, saveTrainingChanges, trainingChanges, trainingTimeOn, type TrainingChanges } from './trainingWeek';

/*
 * Something new in Proairetos that lands on a planned run (Askesis) or strength session (Dynamis): the session, the
 * nearest times that still hold it that day, and the day the training week would give it instead. Offered once, at
 * the moment it was set; the person picks or keeps both.
 */

export type Clash = {
  item: { id: string; title: string };
  session: Session;
  /** Other starting times that day, nearest first (at most two). */
  times: Date[];
  /** Another day the week allows for it. */
  day?: string;
};

/** The runs and strength sessions planned on a date, with their times when the person keeps one. */
export async function sessionsOn(date: string): Promise<Session[]> {
  const out: Session[] = [];
  const thisMonday = mondayOnOrBefore(toLocalDate(new Date()));
  const monday = mondayOnOrBefore(date);
  if (isAdded('askesis')) {
    const runs = await readRuns();
    const state = runs.plan;
    if (state && state.restWeek !== monday) {
      const later = monday > thisMonday;
      const week = weekAt(ownPath(state), later ? state.week + 1 : state.week);
      const day = layOut(week, date, state.weekdays, later ? {} : state.moves, runs.workouts, [], runsPlaced(state, date)).find((each) => each.date === date && !each.done);
      if (day) {
        const time = trainingTimeOn('askesis', date, day.workout.id) ?? state.runAt;
        out.push({
          app: 'askesis',
          id: day.workout.id,
          title: day.workout.kind === 'race' ? day.workout.title : `${day.workout.title}`,
          date,
          minutes: day.workout.kind === 'race' ? 90 : Math.max(20, Math.round(totalMinutes(day.workout.parts))),
          at: time ? atTime(date, time) : undefined,
        });
      }
    }
  }
  const setup = dynamisPlan.load();
  if (isAdded('dynamis') && isSetup(setup)) {
    const done = dynamisWorkouts.list();
    if (isTrainingDay(setup, date, liftDays(date)) && !done.some((workout) => workout.date === date)) {
      const session = nextSession(setup, done);
      const time = trainingTimeOn('dynamis', date) ?? setup.at;
      out.push({ app: 'dynamis', title: session.name, date, minutes: sessionMinutes(targetsFor(setup, session, done)), at: time ? atTime(date, time) : undefined });
    }
  }
  return out;
}

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

/** Everything else holding time on a date: work and protected time, other calendars, timed things in Proairetos, sleep. */
async function busyOn(date: string, items: readonly LifeItem[], leaveOut?: string): Promise<Span[]> {
  const from = atTime(date, '00:00');
  const until = atTime(addDays(date, 1), '00:00');
  const blocks = await scheduleService.occurrencesBetween(new Date(from.getTime() - 2 * 86_400_000), atTime(addDays(date, 2), '00:00'));
  const events = [...otherCalendars.eventsBetween(from, until), ...(await philiaCalendar.eventsBetween(from, until)), ...(await therapeiaCalendar.eventsBetween(from, until))].filter((event) => !event.allDay);
  const timed = items
    .filter((item) => item.id !== leaveOut && item.scheduledAt && item.status !== 'DONE' && !item.repeat)
    .map((item) => itemSpan(item.scheduledAt!, item.endsAt));
  return [...blocks, ...events, ...timed, ...sleepOn(date, blocks)].map((span) => ({ start: span.start, end: span.end })).filter((span) => span.end > from && span.start < until);
}

/** The session a new or moved timed item crowds out, with the ways to keep it; undefined when nothing clashes. */
export async function clashFor(item: LifeItem, now = new Date()): Promise<Clash | undefined> {
  if (!item.scheduledAt || item.repeat) return undefined;
  const span = itemSpan(item.scheduledAt, item.endsAt);
  if (span.end < now || span.start.getTime() > now.getTime() + 8 * 86_400_000) return undefined;
  const quiet = loadQuietHours();
  const items = await lifeService.list();
  for (const date of new Set([toLocalDate(span.start), toLocalDate(new Date(span.end.getTime() - 1))])) {
    const sessions = await sessionsOn(date);
    for (const session of sessions) {
      const others = sessions.filter((each) => each !== session).flatMap((each) => (each.at ? [{ start: each.at, end: new Date(each.at.getTime() + each.minutes * 60_000) }] : []));
      const busy = [...(await busyOn(date, items, item.id)), ...others];
      if (!crowds(session, span, busy, quiet, now)) continue;
      const times = timesThatFit(session, [...busy, span], quiet, now, session.at ?? span.start).slice(0, 2);
      return { item: { id: item.id, title: item.title }, session, times, day: await otherDay(session) };
    }
  }
  return undefined;
}

/** Where the training week puts the session once it is kept off its day. */
async function otherDay(session: Session): Promise<string | undefined> {
  const today = toLocalDate(new Date());
  const monday = mondayOnOrBefore(session.date);
  const current = trainingChanges();
  const trying: TrainingChanges = { ...current, notOn: [...current.notOn, { app: session.app, id: session.id, date: session.date }] };
  const before = await fitWeekOf(monday, monday > today ? monday : today, today, current);
  const after = await fitWeekOf(monday, monday > today ? monday : today, today, trying);
  if (!after) return undefined;
  if (session.app === 'askesis') return session.id && after.runs[session.id] !== session.date ? after.runs[session.id] : undefined;
  const was = new Set(Object.values(before?.lifts ?? {}));
  return Object.values(after.lifts).find((date) => !was.has(date) && date !== session.date);
}

/** Moves the session to another time that day; gives back how to undo it. */
export function keepAtTime(session: Session, at: Date): () => void {
  const before = trainingChanges();
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  saveTrainingChanges({
    ...before,
    at: [...before.at.filter((each) => !(each.app === session.app && each.date === session.date && each.id === session.id)), { app: session.app, id: session.id, date: session.date, time }],
  });
  return () => saveTrainingChanges(before);
}

/** Keeps the session off its day so the week places it again; gives back how to undo it. */
export function keepOffDay(session: Session): () => void {
  const before = trainingChanges();
  saveTrainingChanges({ ...before, notOn: [...before.notOn, { app: session.app, id: session.id, date: session.date }] });
  return () => saveTrainingChanges(before);
}

/**
 * Sessions in the next week that work or protected time now crowds out, after the schedule changed. Each comes with
 * the same ways to keep it; `key` tells one clash from another, so only new ones are offered.
 */
export async function scheduleClashes(now = new Date()): Promise<(Clash & { key: string })[]> {
  await fitAhead(now).catch(() => undefined);
  const quiet = loadQuietHours();
  const items = await lifeService.list();
  const today = toLocalDate(now);
  const out: (Clash & { key: string })[] = [];
  for (let step = 0; step < 8; step += 1) {
    const date = addDays(today, step);
    const sessions = await sessionsOn(date);
    if (!sessions.length) continue;
    const blocks = (await scheduleService.occurrencesBetween(atTime(addDays(date, -1), '00:00'), atTime(addDays(date, 1), '00:00'))).filter(
      (block) => block.end > atTime(date, '00:00') && block.start < atTime(addDays(date, 1), '00:00'),
    );
    for (const session of sessions) {
      const others = sessions.filter((each) => each !== session).flatMap((each) => (each.at ? [{ start: each.at, end: new Date(each.at.getTime() + each.minutes * 60_000) }] : []));
      const all = [...(await busyOn(date, items)), ...others];
      for (const block of blocks) {
        const span = { start: block.start, end: block.end };
        const without = all.filter((each) => !(each.start.getTime() === span.start.getTime() && each.end.getTime() === span.end.getTime()));
        if (!crowds(session, span, without, quiet, now)) continue;
        out.push({
          key: `${session.app}:${session.id ?? ''}:${date}:${span.start.getTime()}:${span.end.getTime()}`,
          item: { id: `schedule:${block.patternId}:${block.date}`, title: block.label || block.patternName },
          session,
          times: timesThatFit(session, all, quiet, now, session.at ?? span.end).slice(0, 2),
          day: await otherDay(session),
        });
        break;
      }
    }
  }
  return out;
}
