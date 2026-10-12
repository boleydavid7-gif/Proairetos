import { useMemo } from 'react';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon, ListIcon } from '../../components/icons/Icons';
import { MoonIcon, PersonIcon } from '../../app/family/icons';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { addDays } from '../../core/scheduling/dates';
import { planBetween, timeText } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { people } from '../../philia/app/state';
import { comingUp, whenText } from '../../philia/core/people';
import { grouped } from '../../ergon/core/chores';
import { useChores } from '../../ergon/app/state';
import { addDays as nextDay, toLocalDate } from '../../core/scheduling/dates';
import { appointments, medicines, useAnchors } from '../../therapeia/app/state';
import { dosesOn, isCurrent } from '../../therapeia/core/medicines';
import { isSetup, plan as dynamisPlan, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { isTrainingDay, nextSession, sessionMinutes, targetsFor } from '../../dynamis/core/plan';
import { things as ktemaThings, upkeeps as ktemaUpkeeps } from '../../ktema/app/state';
import { grouped as upkeepGrouped } from '../../ktema/core/things';
import { settings as phytonSettings, usePlants } from '../../phyton/app/state';
import { grouped as plantsGrouped } from '../../phyton/core/plants';
import NotForMe from './NotForMe';

function QuietLink({ href, icon, line, detail, part }: { href: string; icon: React.ReactNode; line: string; detail: string; part: Parameters<typeof NotForMe>[0]['part'] }) {
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href={href}>
        <span className="quiet-row__icon" aria-hidden="true">{icon}</span>
        <span className="quiet-row__text">
          <span>{line}</span>
          <span className="quiet-row__detail">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part={part} />
    </div>
  );
}

/** Tonight's sleep and the next thing before it, from Diaita's plan around the same schedule. Opens Diaita. */
export function TodayRhythm({ now, today, blocks }: { now: Date; today: string; blocks: readonly ScheduleOccurrence[] }) {
  const shows = useTodayParts();
  const settings = diaitaSettings.use();
  const plan = useMemo(
    () => (settings.started ? planBetween(addDays(today, -1), addDays(today, 1), blocks.map((block) => ({ start: block.start, end: block.end, kind: block.kind, label: block.label || block.patternName })), settings) : []),
    [settings, blocks, today],
  );
  if (!shows('diaita') || !settings.started) return null;
  const sleep = plan.find((entry) => entry.kind === 'sleep' && entry.start > now);
  if (!sleep) return null;
  const before = plan.find((entry) => entry.start > now && entry.start < sleep.start && (entry.kind === 'nap' || entry.kind === 'caffeine' || entry.kind === 'wind-down'));
  return (
    <QuietLink
      href="/diaita/"
      icon={<MoonIcon size={20} />}
      line={`${sleep.title} at ${timeText(sleep.start)}`}
      detail={before ? `${before.title} ${timeText(before.start)} · Diaita` : 'Diaita'}
      part="diaita"
    />
  );
}

/** Birthdays and dates in the next week, from Philia. Opens the person. */
export function TodayBirthdays({ today }: { today: string }) {
  const shows = useTodayParts();
  const everyone = people.use();
  if (!shows('birthdays')) return null;
  const soon = comingUp(everyone, today, 7);
  if (soon.length === 0) return null;
  const first = soon[0];
  const name = (entry: (typeof soon)[number]) => (entry.label === 'Birthday' ? `${entry.person.name}’s birthday` : `${entry.person.name}: ${entry.label}`);
  return (
    <QuietLink
      href={soon.length === 1 ? `/philia/?open=${encodeURIComponent(`person:${first.person.id}`)}` : '/philia/'}
      icon={<PersonIcon size={20} />}
      line={soon.slice(0, 2).map((entry) => `${name(entry)} ${whenText(entry.date, today).toLowerCase()}`).join(' · ')}
      detail={soon.length > 2 ? `And ${soon.length - 2} more in Philia` : 'Philia'}
      part="birthdays"
    />
  );
}

/** Chores whose day has come, from Ergon. Opens Ergon. */
export function TodayChores({ today }: { today: string }) {
  const shows = useTodayParts();
  const chores = useChores();
  if (!shows('chores')) return null;
  const now = grouped(chores, today).now;
  if (now.length === 0) return null;
  return (
    <QuietLink
      href="/ergon/"
      icon={<ListIcon size={20} />}
      line={now.slice(0, 3).map((chore) => chore.name).join(' · ')}
      detail={now.length > 3 ? `And ${now.length - 3} more in Ergon` : 'Ergon'}
      part="chores"
    />
  );
}

const clock = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Today's doses not yet marked, and a visit today, from Therapeia. Opens Therapeia. */
export function TodayMedicines() {
  const shows = useTodayParts();
  const all = medicines.use();
  const visits = appointments.use();
  const calendarToday = toLocalDate(new Date());
  const { anchors, dayAt } = useAnchors(nextDay(calendarToday, -1), nextDay(calendarToday, 1));
  if (!shows('medicines')) return null;
  const day = dayAt(new Date());
  const open = dosesOn(all.filter((medicine) => isCurrent(medicine, day)), day, anchors).filter((dose) => !dose.taken);
  const visit = visits.find((each) => each.at.slice(0, 10) === calendarToday);
  if (!open.length && !visit) return null;
  const line = [...open.slice(0, 3).map((dose) => `${dose.medicine.name} ${clock(dose.at)}`), visit ? `${visit.with} ${clock(new Date(visit.at))}` : undefined].filter(Boolean).join(' · ');
  return <QuietLink href="/therapeia/" icon={<ListIcon size={20} />} line={line} detail={open.length > 3 ? `And ${open.length - 3} more in Therapeia` : 'Therapeia'} part="medicines" />;
}

/** On a planned training day, the session waiting, from Dynamis. Opens it. */
export function TodayTraining({ today }: { today: string }) {
  const shows = useTodayParts();
  const setup = dynamisPlan.use();
  const done = dynamisWorkouts.use();
  if (!shows('training') || !isSetup(setup) || !isTrainingDay(setup, today) || done.some((workout) => workout.date === today)) return null;
  const session = nextSession(setup, done);
  return <QuietLink href="/dynamis/?open=session" icon={<ListIcon size={20} />} line={session.name} detail={`About ${sessionMinutes(targetsFor(setup, session, done))} min · Dynamis`} part="training" />;
}

/** Upkeep whose day has come, from Ktema. Opens Ktema. */
export function TodayUpkeep({ today }: { today: string }) {
  const shows = useTodayParts();
  const list = ktemaUpkeeps.use();
  const owned = ktemaThings.use();
  if (!shows('upkeep')) return null;
  const now = upkeepGrouped(list, owned, today).now;
  if (!now.length) return null;
  return <QuietLink href="/ktema/" icon={<ListIcon size={20} />} line={now.slice(0, 3).map((each) => each.upkeep.name).join(' · ')} detail={now.length > 3 ? `And ${now.length - 3} more in Ktema` : 'Ktema'} part="upkeep" />;
}

/** Plants whose day to check has come, from Phyton. Opens Phyton. */
export function TodayPlants({ today }: { today: string }) {
  const shows = useTodayParts();
  const plants = usePlants();
  const phyton = phytonSettings.use();
  if (!shows('plants')) return null;
  // Rain is left to Phyton itself; here a plant outside may show a day early.
  const now = plantsGrouped(plants, today, phyton.hemisphere).now;
  if (!now.length) return null;
  return <QuietLink href="/phyton/" icon={<ListIcon size={20} />} line={now.slice(0, 3).map((plant) => plant.name).join(' · ')} detail={now.length > 3 ? `Check the soil · and ${now.length - 3} more in Phyton` : 'Check the soil · Phyton'} part="plants" />;
}
