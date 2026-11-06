import type { Notice } from '../../core/notify/notices';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { planBetween } from '../../diaita/core/rhythm';
import { rhythmNotices } from '../../diaita/core/notices';
import { settings as diaitaSettings, sunPlace } from '../../diaita/app/state';
import { peopleNotices } from '../../philia/core/notices';
import { people, settings as philiaSettings } from '../../philia/app/state';
import { choreNotices } from '../../ergon/core/notices';
import { allChores, myName as ergonName, settings as ergonSettings } from '../../ergon/app/state';
import { daysOffNow as ergonDaysOff } from '../../ergon/app/daysOff';
import { careNotices } from '../../therapeia/core/notices';
import { anchorsFrom } from '../../therapeia/core/medicines';
import { allMedicines, appointments, settings as therapeiaSettings } from '../../therapeia/app/state';
import { mainSleeps } from '../../diaita/core/rhythm';
import { trainingNotices } from '../../dynamis/core/notices';
import { liftDays, trainingTimeOn } from '../family/trainingWeek';
import { nextSession } from '../../dynamis/core/plan';
import { isSetup, plan as dynamisPlan, settings as dynamisSettings, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { studyNotices } from '../../melete/core/notices';
import { sessions as meleteSessions, subjects as meleteSubjects } from '../../melete/app/state';
import { upkeepNotices } from '../../ktema/core/notices';
import { settings as ktemaSettings, things as ktemaThings, upkeeps as ktemaUpkeeps } from '../../ktema/app/state';
import { plantNotices } from '../../phyton/core/notices';
import { allPlants, myName as phytonName, settings as phytonSettings } from '../../phyton/app/state';
import { forecastNow, rainNow } from '../../phyton/app/rain';
import { weatherSettings } from '../weather/weather';
import { tripNotices } from '../../poreia/core/notices';
import { bookings as poreiaBookings, packing as poreiaPacking, plans as poreiaPlans, settings as poreiaSettings, trips as poreiaTrips } from '../../poreia/app/state';
import { otherCalendars } from '../calendars/otherCalendars';
import { scheduleService } from '../services';
import { isAdded } from '../family/added';
import { householdActor } from '../household/household';

/**
 * The newer apps' notices (Diaita, Philia, Ergon, Therapeia, Dynamis, Ktema, Meletē, Phyton, Poreia), from what they keep on this
 * device (Proairetos sends them all). An app named in `skip` is left out: its notices come through its provider instead.
 */
export async function familyNotices(now: Date, until: Date, skip: ReadonlySet<string> = new Set()): Promise<Notice[]> {
  const today = toLocalDate(now);
  const horizon = Math.ceil((until.getTime() - now.getTime()) / 86_400_000);
  const notices: Notice[] = [];

  const diaita = diaitaSettings.load();
  const blocksFrom = new Date(now.getTime() - 2 * 86_400_000);
  const blocks = async () =>
    [...(await scheduleService.occurrencesBetween(blocksFrom, until)), ...otherCalendars.blocksBetween(blocksFrom, until)].map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      label: block.label || block.patternName,
    }));
  if (diaita.started && isAdded('diaita') && !skip.has('diaita')) {
    const entries = planBetween(addDays(today, -1), addDays(today, horizon), await blocks(), { ...diaita, place: sunPlace() });
    notices.push(...rhythmNotices(entries, diaita.notices, now, until));
  }

  const everyone = people.list();
  if (everyone.length && isAdded('philia') && !skip.has('philia')) notices.push(...peopleNotices(everyone, philiaSettings.load().notices, today, horizon));

  const chores = allChores();
  if (chores.length && isAdded('ergon') && !skip.has('ergon')) {
    const ergon = ergonSettings.load();
    const actor = householdActor('ergon');
    notices.push(...choreNotices(chores, ergon.notices, ergonName(ergon) || undefined, today, horizon, await ergonDaysOff().catch(() => undefined), actor?.id));
  }

  const meds = allMedicines();
  const visits = appointments.list();
  if ((meds.length || visits.length) && isAdded('therapeia') && !skip.has('therapeia')) {
    // Times after waking and before sleep follow the schedule, as Diaita plans the person's sleep.
    const anchors = anchorsFrom(mainSleeps(addDays(today, -2), addDays(today, horizon + 1), await blocks(), diaita));
    notices.push(...careNotices(meds, visits, therapeiaSettings.load().notices, now, until, anchors));
  }

  const training = dynamisPlan.load();
  if (isSetup(training) && dynamisSettings.load().reminders && isAdded('dynamis')) {
    notices.push(...trainingNotices(training, true, nextSession(training, dynamisWorkouts.list()).name, today, horizon, now, liftDays, (date) => trainingTimeOn('dynamis', date)));
  }

  const upkeep = ktemaUpkeeps.list();
  const owned = ktemaThings.list();
  if ((upkeep.length || owned.length) && isAdded('ktema') && !skip.has('ktema')) notices.push(...upkeepNotices(upkeep, owned, ktemaSettings.load().notices, today, horizon, now));

  if (isAdded('melete') && !skip.has('melete')) notices.push(...studyNotices(meleteSubjects.list(), meleteSessions.list(), today, horizon, now));

  const plants = allPlants();
  if (plants.length && isAdded('phyton') && !skip.has('phyton')) {
    const phyton = phytonSettings.load();
    notices.push(
      ...plantNotices(plants, phyton.notices, phytonName(phyton) || undefined, today, horizon, now, {
        hemisphere: phyton.hemisphere,
        rain: phyton.rain ? rainNow() : {},
        forecast: phyton.rain ? forecastNow() : {},
        unit: weatherSettings().unit,
        away: phyton.away,
      }),
    );
  }

  const trips = poreiaTrips.list();
  if (trips.length && isAdded('poreia') && !skip.has('poreia')) notices.push(...tripNotices(trips, poreiaBookings.list(), poreiaPlans.list(), poreiaPacking.list(), poreiaSettings.load().notices, now, until));
  return notices;
}
