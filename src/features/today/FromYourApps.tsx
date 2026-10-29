import { useTodayParts } from '../../app/hooks/useTodayParts';
import { fromAppsRows, type FromAppsRow } from '../../app/family/fromApps';
import { FamilyMark } from '../../app/family/marks';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { usePlants, settings as phytonSettings } from '../../phyton/app/state';
import { useForecast, useRain } from '../../phyton/app/rain';
import { hotDays } from '../../phyton/core/outdoors';
import { nextCheck, dayText } from '../../phyton/core/plants';
import { useChores } from '../../ergon/app/state';
import { nextDay as choreDay, shownDay as choreShownDay } from '../../ergon/core/chores';
import { useDaysOff } from '../../ergon/app/daysOff';
import { liftDays, useFittedWeek } from '../../app/family/trainingWeek';
import { appointments, useAnchors, useMedicines } from '../../therapeia/app/state';
import { dosesOn, isCurrent } from '../../therapeia/core/medicines';
import { things as ktemaThings, upkeeps as ktemaUpkeeps } from '../../ktema/app/state';
import { grouped as upkeepGrouped } from '../../ktema/core/things';
import { isSetup, plan as dynamisPlan, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { isTrainingDay, nextSession, sessionMinutes, targetsFor } from '../../dynamis/core/plan';
import { useRecipesFromSoma } from '../../app/soma/meals';

const clock = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function Row({ row }: { row: FromAppsRow }) {
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href={row.href}>
        <span className="quiet-row__icon" aria-hidden="true">
          <FamilyMark app={row.app} size={20} />
        </span>
        <span className="quiet-row__text">
          <span>{row.title}</span>
          <span className="quiet-row__detail">{row.detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
    </div>
  );
}

/**
 * From your apps: plants to check, chores, today's doses and visits, upkeep, meals planned for today and a training
 * day, as one list. Each row opens its app; nothing is kept here.
 */
export default function FromYourApps({ today, embedded = false }: { today: string; embedded?: boolean }) {
  const shows = useTodayParts();
  const plants = usePlants();
  const phyton = phytonSettings.use();
  const rain = useRain(phyton.rain);
  const forecast = useForecast(phyton.rain);
  const chores = useChores();
  const choresOff = useDaysOff();
  useFittedWeek(today);
  const allMedicines = useMedicines();
  const visits = appointments.use();
  const calendarToday = toLocalDate(new Date());
  const { anchors, dayAt } = useAnchors(addDays(calendarToday, -1), addDays(calendarToday, 1));
  const upkeeps = ktemaUpkeeps.use();
  const owned = ktemaThings.use();
  const training = dynamisPlan.use();
  const workouts = dynamisWorkouts.use();
  const recipes = useRecipesFromSoma();

  const hot = hotDays(forecast);
  const doseDay = dayAt(new Date());
  const rows = fromAppsRows({
    today,
    dayText,
    clock,
    plants: shows('plants') ? plants.map((plant) => ({ plant, day: nextCheck(plant, today, phyton.hemisphere, rain, hot) })).filter((each) => each.day <= today).sort((a, b) => a.day.localeCompare(b.day) || a.plant.name.localeCompare(b.plant.name)) : [],
    chores: shows('chores') ? chores.map((chore) => { const day = choreDay(chore, choresOff); return { chore, day: day && choreShownDay(chore, day, today) }; }).filter((each): each is { chore: (typeof chores)[number]; day: string } => Boolean(each.day && each.day <= today)).sort((a, b) => a.day.localeCompare(b.day) || a.chore.name.localeCompare(b.chore.name)) : [],
    doses: shows('medicines') ? dosesOn(allMedicines.filter((medicine) => isCurrent(medicine, doseDay)), doseDay, anchors).filter((dose) => !dose.taken) : [],
    visits: shows('medicines') ? visits.filter((visit) => visit.at.slice(0, 10) === calendarToday) : [],
    upkeep: shows('upkeep') ? upkeepGrouped(upkeeps, owned, today).now.map((each) => ({ ...each, thing: owned.find((thing) => thing.id === each.upkeep.thingId)?.name })) : [],
    meals: shows('soma') ? recipes.filter((recipe) => recipe.planned?.includes(today) && !recipe.cooked?.includes(today)).sort((a, b) => a.title.localeCompare(b.title)) : [],
    training: shows('training') && isSetup(training) && isTrainingDay(training, today, liftDays(today)) && !workouts.some((workout) => workout.date === today)
      ? (() => {
          const session = nextSession(training, workouts);
          return { name: session.name, minutes: sessionMinutes(targetsFor(training, session, workouts)) };
        })()
      : undefined,
  });
  if (!rows.length) return null;
  if (embedded) return <>{rows.map((row) => <Row key={row.key} row={row} />)}</>;

  return (
    <section className="from-apps" aria-labelledby="from-apps-title">
      <h2 id="from-apps-title" className="section-label">From your apps</h2>
      <div className="today-group">{rows.map((row) => <Row key={row.key} row={row} />)}</div>
    </section>
  );
}
