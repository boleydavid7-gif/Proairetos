import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { PersonIcon, SuitcaseIcon } from '../../app/family/icons';
import { addDays } from '../../core/scheduling/dates';
import { people } from '../../philia/app/state';
import { comingUp, whenText } from '../../philia/core/people';
import { bookings as tripBookings, packing as tripPacking, plans as tripPlans, trips } from '../../poreia/app/state';
import { daysOf, entryTitle, nextUp, phaseOf, phaseText, sortTrips } from '../../poreia/core/model';
import NotForMe from './NotForMe';
import SwipeLine from './SwipeLine';

function QuietLink({ id, href, icon, line, detail, part }: { id: string; href: string; icon: React.ReactNode; line: string; detail: string; part: Parameters<typeof NotForMe>[0]['part'] }) {
  return (
    <SwipeLine id={id} title={line}>
      <a className="quiet-row" href={href}>
        <span className="quiet-row__icon" aria-hidden="true">{icon}</span>
        <span className="quiet-row__text">
          <span>{line}</span>
          <span className="quiet-row__detail">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part={part} />
    </SwipeLine>
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
      id={`birthdays:${soon.map((entry) => `${entry.person.id}@${entry.date}`).join(',')}`}
      href={soon.length === 1 ? `/philia/?open=${encodeURIComponent(`person:${first.person.id}`)}` : '/philia/'}
      icon={<PersonIcon size={20} />}
      line={soon.slice(0, 2).map((entry) => `${name(entry)} ${whenText(entry.date, today).toLowerCase()}`).join(' · ')}
      detail={soon.length > 2 ? `And ${soon.length - 2} more · Philia` : 'Philia'}
      part="birthdays"
    />
  );
}

const clockText = (time?: string) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** A trip under way, or one starting within three days, from Poreia: where it stands and the next thing on it. */
export function TodayTrip({ now, today }: { now: Date; today: string }) {
  const shows = useTodayParts();
  const all = trips.use();
  const allBookings = tripBookings.use();
  const allPlans = tripPlans.use();
  const allPacking = tripPacking.use();
  if (!shows('trips')) return null;
  const { now: away, ahead } = sortTrips(all, today);
  const trip = away[0] ?? ahead.find((each) => { const phase = phaseOf(each, today); return phase.kind === 'ahead' && phase.days <= 3; });
  if (!trip) return null;
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const next = nextUp(daysOf(trip, allBookings.filter((each) => each.tripId === trip.id), allPlans.filter((each) => each.tripId === trip.id)), today, clock);
  const left = allPacking.filter((each) => each.tripId === trip.id && !each.packed).length;
  const nextText = next ? `${next.date === today ? clockText(next.entry.time) || 'Today' : next.date === addDays(today, 1) ? 'Tomorrow' : ''} ${entryTitle(next.entry)}`.trim() : undefined;
  return (
    <QuietLink
      id={`trip:${trip.id}`}
      href={`/poreia/?open=${encodeURIComponent(`trip:${trip.id}`)}`}
      icon={<SuitcaseIcon size={20} />}
      line={away[0] === trip ? `${trip.name} · ${phaseText(phaseOf(trip, today))}` : `${trip.name} ${phaseText(phaseOf(trip, today)).toLowerCase()}`}
      detail={[nextText, away[0] !== trip && left ? `${left} to pack` : undefined, 'Poreia'].filter(Boolean).join(' · ')}
      part="trips"
    />
  );
}
