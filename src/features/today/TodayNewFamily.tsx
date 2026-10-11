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
