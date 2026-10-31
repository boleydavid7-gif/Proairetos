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

/** The newer apps' notices (Diaita, Philia, Ergon, Therapeia, Dynamis, Ktema, Phyton), from what they keep on this device (Proairetos sends them all). */
export async function familyNotices(now: Date, until: Date): Promise<Notice[]> {
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
  if (diaita.started && isAdded('diaita')) {
    const entries = planBetween(addDays(today, -1), addDays(today, horizon), await blocks(), { ...diaita, place: sunPlace() });
    notices.push(...rhythmNotices(entries, diaita.notices, now, until));
  }

  const everyone = people.list();
  if (everyone.length && isAdded('philia')) notices.push(...peopleNotices(everyone, philiaSettings.load().notices, today, horizon));

  const chores = allChores();
  if (chores.length && isAdded('ergon')) {
    const ergon = ergonSettings.load();
    notices.push(...choreNotices(chores, ergon.notices, ergonName(ergon) || undefined, today, horizon, await ergonDaysOff().catch(() => undefined)));
  }

  const meds = allMedicines();
  const visits = appointments.list();
  if ((meds.length || visits.length) && isAdded('therapeia')) {
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
  if ((upkeep.length || owned.length) && isAdded('ktema')) notices.push(...upkeepNotices(upkeep, owned, ktemaSettings.load().notices, today, horizon, now));

  const plants = allPlants();
  if (plants.length && isAdded('phyton')) {
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
  if (trips.length && isAdded('poreia')) notices.push(...tripNotices(trips, poreiaBookings.list(), poreiaPlans.list(), poreiaPacking.list(), poreiaSettings.load().notices, now, until));
  return notices;
}
