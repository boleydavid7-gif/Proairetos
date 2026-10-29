import { useTodayParts } from '../../app/hooks/useTodayParts';
import { fromAppsRows, type FromAppsRow, type Mark } from '../../app/family/fromApps';
import SwipeLine, { NotTodayFold, SwipeDay } from './SwipeLine';
import { FamilyMark } from '../../app/family/marks';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { usePlants, putPlant, myName as phytonName, settings as phytonSettings } from '../../phyton/app/state';
import { useForecast, useRain } from '../../phyton/app/rain';
import { hotDays } from '../../phyton/core/outdoors';
import { nextCheck, water, dayText } from '../../phyton/core/plants';
import { useChores, putChore, myName as ergonName } from '../../ergon/app/state';
import { markDone as choreDone, nextDay as choreDay, shownDay as choreShownDay } from '../../ergon/core/chores';
import { useDaysOff } from '../../ergon/app/daysOff';
import { liftDays, useFittedWeek } from '../../app/family/trainingWeek';
import { appointments, putMedicine, restoreMedicine, useAnchors, useMedicines } from '../../therapeia/app/state';
import { dosesOn, isCurrent, take } from '../../therapeia/core/medicines';
import { things as ktemaThings, upkeeps as ktemaUpkeeps, putUpkeep } from '../../ktema/app/state';
import { grouped as upkeepGrouped, markDone as upkeepDone } from '../../ktema/core/things';
import { isSetup, plan as dynamisPlan, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { isTrainingDay, nextSession, sessionMinutes, targetsFor } from '../../dynamis/core/plan';
import { useRecipesFromSoma } from '../../app/soma/meals';
import { putRecipe } from '../../soma/data/store';

const clock = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Marks the row's thing in its own app, and gives back how to take the mark off again. */
function markIn(mark: Mark, today: string): () => void {
  switch (mark.kind) {
    case 'plant': {
      const before = mark.plant;
      putPlant(water(before, today, phytonName() || before.who));
      return () => putPlant(before);
    }
    case 'chore': {
      const before = mark.chore;
      putChore(choreDone(before, today, ergonName() || before.who));
      return () => putChore(before);
    }
    case 'dose': {
      const before = mark.dose.medicine;
      putMedicine(take(before, mark.dose.slot, new Date()));
      return () => restoreMedicine(before);
    }
    case 'upkeep': {
      const before = mark.upkeep;
      putUpkeep(upkeepDone(before, today));
      return () => putUpkeep(before);
    }
    case 'meal': {
      const before = mark.recipe;
      void putRecipe({ ...before, cooked: [...(before.cooked ?? []).filter((day) => day !== today), today], updatedAt: new Date().toISOString() });
      return () => void putRecipe(before);
    }
  }
}

function RowLink({ row }: { row: FromAppsRow }) {
  return (
    // Not draggable, so a mouse pulling the row sideways moves it instead of dragging the link.
    <a className="quiet-row" href={row.href} draggable={false}>
      <span className="quiet-row__icon" aria-hidden="true">
        <FamilyMark app={row.app} size={20} />
      </span>
      <span className="quiet-row__text">
        <span>{row.title}</span>
        <span className="quiet-row__detail">{row.detail}</span>
      </span>
      <ChevronRightIcon size={18} className="quiet-row__chevron" />
    </a>
  );
}

/** A row: pull left to mark it in its app (where it can be marked), pull right to set it aside until tomorrow. */
function Row({ row, today }: { row: FromAppsRow; today: string }) {
  return (
    <SwipeLine id={row.key} title={row.title} doneWord={row.done} mark={row.mark ? () => markIn(row.mark!, today) : undefined}>
      <RowLink row={row} />
    </SwipeLine>
  );
}

/**
 * From your apps: plants to check, chores, today's doses and visits, upkeep, meals planned for today and a training
 * day, as one list. Each row opens its app; a pull to the left marks it there with undo, a pull to the right sets it
 * aside until tomorrow (`notToday.ts`). Nothing else is kept here.
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
  const list = rows.map((row) => <Row key={row.key} row={row} today={today} />);
  if (embedded) return <>{list}</>;

  return (
    <section className="from-apps" aria-labelledby="from-apps-title">
      <h2 id="from-apps-title" className="section-label">From your apps</h2>
      <SwipeDay.Provider value={today}>
        <div className="today-group">
          {list}
          <NotTodayFold />
        </div>
      </SwipeDay.Provider>
    </section>
  );
}
