import AppGroup from './AppGroup';
import { FromAppsGroup, useFromYourAppsRows } from './FromYourApps';
import { NotTodayFold, SwipeDay } from './SwipeLine';
import { TodayBirthdays, TodayTrip } from './TodayNewFamily';
import TodayFamily, { TodayPursuit } from './TodayFamily';
import { useAddedApps } from '../../app/family/added';
import { useTodayAppsVisibility } from '../../app/hooks/useTodayAppsVisibility';
import { DAILY_PRACTICE_APPS, type AttentionApp, type DailyPracticeApp } from '../../core/today/apps';
import { useDrinks as useHydrosDrinks, useSettings as useHydrosSettings } from '../../hydros/app/state';
import { useDays as useHydrosDays } from '../../hydros/app/day';
import { defaultDrinkProfiles, effectiveGoalOz, formatVolume, hydrationOz, type HydrosUnit } from '../../hydros/core/drinks';
import { runLength, runTitle, todaysRun, useRuns } from '../../app/askesis/runs';
import { plan as dynamisPlan, workouts as dynamisWorkouts, isSetup as isDynamisSetup } from '../../dynamis/app/state';
import { isTrainingDay, nextSession, sessionsFor } from '../../dynamis/core/plan';
import { liftDays, useFittedWeek } from '../../app/family/trainingWeek';
import { settings as diaitaSettings, sleeps as diaitaSleeps } from '../../diaita/app/state';
import { hoursText, sleptMinutes } from '../../diaita/core/rhythm';
import { studyBetween, useStudy } from '../../app/praxis/study';
import { ChevronRightIcon } from '../../components/icons/Icons';

type DayRange = { start: Date; end: Date };

function PracticeLink({ href, detail, progress, progressLabel }: { href: string; detail: string; progress?: number; progressLabel?: string }) {
  return (
    <a className="quiet-row today-practice-link" href={href}>
      <span className="quiet-row__icon" aria-hidden="true" />
      <span className="quiet-row__text">
        <span>{detail}</span>
        {progress !== undefined && (
          <span
            className="today-practice-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-valuetext={progressLabel}
          >
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        )}
      </span>
      <ChevronRightIcon size={18} className="quiet-row__chevron" />
    </a>
  );
}

/** The five ongoing practices: one small, current signal from each installed app. */
export function DailyPractices({ today, range }: { today: string; range: DayRange }) {
  const added = useAddedApps();
  const hidden = useTodayAppsVisibility();

  const drinks = useHydrosDrinks() ?? [];
  const hydrosSettings = useHydrosSettings();
  const hydrosDays = useHydrosDays(today, today);
  const drinksToday = drinks.filter((drink) => hydrosDays.dayOf(drink) === today);
  const profiles = hydrosSettings.drinkProfiles?.length ? hydrosSettings.drinkProfiles : defaultDrinkProfiles();
  const unit = (hydrosSettings.unit ?? 'oz') as HydrosUnit;
  const hydration = hydrationOz(drinksToday, profiles);
  const goal = hydrosSettings.goalChosen ? effectiveGoalOz(hydrosSettings) : undefined;

  const runs = useRuns();
  const run = todaysRun(runs, today);
  const completedRun = runs?.workouts.filter((entry) => entry.date === today).slice(-1)[0];

  const dynamisSetup = dynamisPlan.use();
  const strengthWorkouts = dynamisWorkouts.use();
  useFittedWeek(today);
  const strengthReady = isDynamisSetup(dynamisSetup);
  const strengthToday = strengthReady ? strengthWorkouts.filter((workout) => workout.date === today).slice(-1)[0] : undefined;
  const strengthSession = strengthReady ? nextSession(dynamisSetup, strengthWorkouts) : undefined;
  const strengthDoneName = strengthToday && strengthReady
    ? sessionsFor(dynamisSetup).find((session) => session.key === strengthToday.session)?.name
    : undefined;
  const strengthIsPlanned = strengthReady && isTrainingDay(dynamisSetup, today, liftDays(today));

  const sleepSettings = diaitaSettings.use();
  const sleepRecords = diaitaSleeps.use();
  const lastSleep = sleepRecords.filter((record) => record.date === today).slice(-1)[0];

  const study = useStudy(added.includes('theoria'));
  const readingMinutes = study
    ? studyBetween(study.sessions, range.start, range.end)
        .filter((session) => session.kind === 'reading')
        .reduce((total, session) => total + session.minutes, 0)
    : 0;

  const detail: Record<DailyPracticeApp, string> = {
    hydros: goal
      ? `${formatVolume(hydration, unit)} of ${formatVolume(goal, unit)} ${unit}`
      : hydration > 0 ? `${formatVolume(hydration, unit)} ${unit} logged` : 'No drinks logged yet',
    askesis: runs === undefined ? 'Loading your plan…' : run
      ? [run.title, runLength(run)].filter(Boolean).join(' · ')
      : completedRun ? `${runTitle(completedRun, runs.unit)} · Done today`
      : runs.plan ? 'No run scheduled today' : 'Start a running plan',
    dynamis: !strengthReady
      ? 'Set up strength training'
      : strengthToday ? `${strengthDoneName ?? 'Strength session'} · Done today`
      : strengthIsPlanned ? `Strength session · ${strengthSession?.name ?? 'Next session'}`
      : 'Rest day',
    diaita: !sleepSettings.started
      ? 'Set up sleep tracking'
      : lastSleep ? `${hoursText(sleptMinutes(lastSleep))} slept` : 'Log last night’s sleep',
    theoria: study === undefined
      ? 'Reading activity'
      : readingMinutes ? `${readingMinutes} min reading today` : 'No reading logged today',
  };
  const links: Record<DailyPracticeApp, string> = {
    hydros: '/hydros/',
    askesis: '/askesis/',
    dynamis: '/dynamis/',
    diaita: '/diaita/',
    theoria: '/theoria/',
  };

  const visible = DAILY_PRACTICE_APPS.filter((app) => added.includes(app) && !hidden.has(app));
  if (!visible.length) return null;

  return (
    <section className="today-app-overview today-app-overview--daily" aria-labelledby="daily-practices-title">
      <div className="section-heading">
        <h2 id="daily-practices-title" className="section-label">Daily practices</h2>
        <a className="text-link" href="/?open=settings%3Atoday">Customize</a>
      </div>
      <div className="today-app-overview__card">
        {visible.map((app) => (
          <AppGroup key={app} app={app} compact>
            <PracticeLink
              href={links[app]}
              detail={detail[app]}
              progress={app === 'hydros' && goal ? Math.max(0, Math.min(1, hydration / goal)) : undefined}
              progressLabel={app === 'hydros' && goal ? `${formatVolume(hydration, unit)} of ${formatVolume(goal, unit)} ${unit}` : undefined}
            />
          </AppGroup>
        ))}
      </div>
    </section>
  );
}

/** Relevant, actionable signals from the other apps. Empty apps take no space. */
export function WorthYourAttention({ today, now }: { today: string; now: Date }) {
  const added = useAddedApps();
  const hidden = useTodayAppsVisibility();
  const rows = useFromYourAppsRows(today);
  const visible = (app: AttentionApp) => added.includes(app) && !hidden.has(app);
  const rowsFor = (app: 'ergon' | 'ktema' | 'phyton' | 'soma' | 'therapeia') => rows.filter((row) => row.app === app);

  return (
    <section className="today-app-overview today-app-overview--attention" aria-labelledby="worth-attention-title">
      <div className="section-heading">
        <h2 id="worth-attention-title" className="section-label">Worth your attention</h2>
        <a className="text-link" href="/?open=settings%3Atoday">Customize</a>
      </div>
      <div className="today-app-overview__card">
        <SwipeDay.Provider value={today}>
          {visible('ergon') && <FromAppsGroup app="ergon" rows={rowsFor('ergon')} today={today} compact />}
          {visible('ktema') && <FromAppsGroup app="ktema" rows={rowsFor('ktema')} today={today} compact />}
          {visible('oikonomia') && <AppGroup app="oikonomia" compact><TodayFamily today={today} /></AppGroup>}
          {visible('philia') && <AppGroup app="philia" compact><TodayBirthdays today={today} /></AppGroup>}
          {visible('phyton') && <FromAppsGroup app="phyton" rows={rowsFor('phyton')} today={today} compact />}
          {visible('poreia') && <AppGroup app="poreia" compact><TodayTrip now={now} today={today} /></AppGroup>}
          {visible('soma') && <FromAppsGroup app="soma" rows={rowsFor('soma')} today={today} compact />}
          {visible('therapeia') && <FromAppsGroup app="therapeia" rows={rowsFor('therapeia')} today={today} compact />}
          <AppGroup app="proairetos" name="Compass" compact><TodayPursuit /></AppGroup>
          <div className="today-group today-group--aside"><NotTodayFold /></div>
        </SwipeDay.Provider>
      </div>
    </section>
  );
}
