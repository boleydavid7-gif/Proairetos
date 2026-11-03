import { useTodayParts } from '../../app/hooks/useTodayParts';
import { fromAppsRows, type FromAppsRow, type Mark } from '../../app/family/fromApps';
import SwipeLine, { NotTodayFold, SwipeDay } from './SwipeLine';
import AppGroup from './AppGroup';
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
import { appointments, putMedicine, restoreMedicine, useAnchors, useMedicines } from '../../therapeia/app/state';
import { dosesOn, isCurrent, refillDay, take } from '../../therapeia/core/medicines';
import { things as ktemaThings, upkeeps as ktemaUpkeeps, putUpkeep } from '../../ktema/app/state';
import { grouped as upkeepGrouped, markDone as upkeepDone } from '../../ktema/core/things';
import { useRecipesFromSoma } from '../../app/soma/meals';
import { putRecipe } from '../../soma/data/store';

const clock = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Marks the row's thing in its own app, and gives back how to take the mark off again. */
export function markFromApp(mark: Mark, today: string): () => void {
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
    <SwipeLine id={row.key} title={row.title} doneWord={row.done} mark={row.mark ? () => markFromApp(row.mark!, today) : undefined}>
      <RowLink row={row} />
    </SwipeLine>
  );
}

/** Read today's actionable rows from the apps; nothing is copied into Proairetos. */
export function useFromYourAppsRows(today: string): FromAppsRow[] {
  const shows = useTodayParts();
  const plants = usePlants();
  const phyton = phytonSettings.use();
  const rain = useRain(phyton.rain);
  const forecast = useForecast(phyton.rain);
  const chores = useChores();
  const choresOff = useDaysOff();
  const allMedicines = useMedicines();
  const visits = appointments.use();
  const calendarToday = toLocalDate(new Date());
  const { anchors, dayAt } = useAnchors(addDays(calendarToday, -1), addDays(calendarToday, 1));
  const upkeeps = ktemaUpkeeps.use();
  const owned = ktemaThings.use();
  const recipes = useRecipesFromSoma();

  const hot = hotDays(forecast);
  const doseDay = dayAt(new Date());
  return fromAppsRows({
    today,
    dayText,
    clock,
    plants: shows('plants') ? plants.map((plant) => ({ plant, day: nextCheck(plant, today, phyton.hemisphere, rain, hot) })).filter((each) => each.day <= today).sort((a, b) => a.day.localeCompare(b.day) || a.plant.name.localeCompare(b.plant.name)) : [],
    chores: shows('chores') ? chores.map((chore) => { const day = choreDay(chore, choresOff); return { chore, day: day && choreShownDay(chore, day, today) }; }).filter((each): each is { chore: (typeof chores)[number]; day: string } => Boolean(each.day && each.day <= today)).sort((a, b) => a.day.localeCompare(b.day) || a.chore.name.localeCompare(b.chore.name)) : [],
    doses: shows('medicines') ? dosesOn(allMedicines.filter((medicine) => isCurrent(medicine, doseDay)), doseDay, anchors).filter((dose) => !dose.taken) : [],
    refills: shows('medicines') ? allMedicines.map((medicine) => ({ medicine, day: refillDay(medicine, today) })).filter((entry): entry is { medicine: (typeof allMedicines)[number]; day: string } => Boolean(entry.day && entry.day <= addDays(today, 7))) : [],
    visits: shows('medicines') ? visits.filter((visit) => visit.at.slice(0, 10) === calendarToday) : [],
    upkeep: shows('upkeep') ? upkeepGrouped(upkeeps, owned, today).now.map((each) => ({ ...each, thing: owned.find((thing) => thing.id === each.upkeep.thingId)?.name })) : [],
    meals: shows('soma') ? recipes.filter((recipe) => recipe.planned?.includes(today) && !recipe.cooked?.includes(today)).sort((a, b) => a.title.localeCompare(b.title)) : [],
  });
}

/** One app's actionable rows, kept together so its mark and name are easy to scan. */
export function FromAppsGroup({ app, rows, today, compact = false }: { app: FromAppsRow['app']; rows: FromAppsRow[]; today: string; compact?: boolean }) {
  if (!rows.length) return null;
  return (
    <AppGroup app={app} compact={compact}>
      {rows.map((row) => <Row key={row.key} row={row} today={today} />)}
    </AppGroup>
  );
}

/** The detailed, swipeable version remains available to screens that need the full task list. */
export default function FromYourApps({ today, embedded = false, compact = false }: { today: string; embedded?: boolean; compact?: boolean }) {
  const rows = useFromYourAppsRows(today);
  if (!rows.length) return null;
  const preferred: FromAppsRow['app'][] = ['ergon', 'ktema', 'phyton', 'soma', 'therapeia'];
  const apps = preferred.filter((app) => rows.some((row) => row.app === app));
  const list = apps.map((app) => (
    <FromAppsGroup key={app} app={app} rows={rows.filter((row) => row.app === app)} today={today} compact={compact} />
  ));
  if (embedded) return <>{list}</>;

  return (
    <section className="from-apps" aria-labelledby="from-apps-title">
      <h2 id="from-apps-title" className="section-label">From your apps</h2>
      <SwipeDay.Provider value={today}>
        {list}
        <div className="today-group today-group--aside">
          <NotTodayFold />
        </div>
      </SwipeDay.Provider>
    </section>
  );
}
