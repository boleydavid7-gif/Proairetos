import { useEffect, useState, useSyncExternalStore } from 'react';
import { Brand, offerUndo } from '../../app/family/shell';
import { AppMark, ChevronIcon } from '../../app/family/icons';
import { energyFor, setEnergy, subscribePreferences, type Energy } from '../../data/storage/preferences';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import photo from '../../assets/images/scenes/sunrise.webp';
import photoWide from '../../assets/images/scenes/sunrise-wide.webp';
import type { DiaitaNav } from '../app/App';
import { sleeps, usePlan } from '../app/state';
import { Timeline, span } from '../app/ui';
import { DAY_NAMES, QUALITY_NAMES, clockText, dayKind, entriesOn, hoursText, plannedSleepInto, sleptMinutes, type SleepQuality } from '../core/rhythm';

const ENERGY: { id: Energy; label: string }[] = [
  { id: 'full', label: 'Plenty' },
  { id: 'some', label: 'Some' },
  { id: 'low', label: 'Low' },
];

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function CheckIn({ date, planned, nav }: { date: string; planned?: { bed: string; up: string }; nav: DiaitaNav }) {
  const kept = sleeps.use().find((record) => record.id === date);
  const [bed, setBed] = useState(planned?.bed ?? '23:00');
  const [up, setUp] = useState(planned?.up ?? '07:00');
  const [how, setHow] = useState<SleepQuality>();
  const energy = useSyncExternalStore(subscribePreferences, () => energyFor(date));

  const energyRow = (
    <div className="field">
      <span className="field__label">Energy</span>
      <div className="chip-row" role="group" aria-label="Energy">
        {ENERGY.map((option) => (
          <button key={option.id} type="button" className="chip" aria-pressed={energy === option.id} onClick={() => setEnergy(date, energy === option.id ? undefined : option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (kept) {
    return (
      <section className="card diaita-checkin">
        <button type="button" className="diaita-checkin__kept" onClick={() => nav.go({ name: 'log', date })}>
          <span className="card__eyebrow">Last night</span>
          <strong>{hoursText(sleptMinutes(kept))}</strong>
          <span className="muted">{clockText(kept.bed)}–{clockText(kept.up)}{kept.how ? ` · ${QUALITY_NAMES[kept.how]}` : ''}</span>
          <ChevronIcon size={18} />
        </button>
        {energyRow}
      </section>
    );
  }

  return (
    <section className="card diaita-checkin">
      <h2 className="card__title">How did you sleep?</h2>
      <div className="chip-row" role="group" aria-label="How you slept">
        {(['well', 'okay', 'poorly'] as const).map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={how === option} onClick={() => setHow(how === option ? undefined : option)}>
            {QUALITY_NAMES[option]}
          </button>
        ))}
      </div>
      <div className="input-row">
        <label className="field">
          <span className="field__label">Bed</span>
          <input className="input" type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Up</span>
          <input className="input" type="time" value={up} onChange={(event) => setUp(event.target.value)} />
        </label>
      </div>
      {energyRow}
      <button
        type="button"
        className="button-main"
        disabled={!bed || !up}
        onClick={() => {
          sleeps.put({ id: date, date, bed, up, how });
          offerUndo('Sleep saved', () => sleeps.remove(date));
        }}
      >
        Save
      </button>
    </section>
  );
}

export default function TodayPage({ nav }: { nav: DiaitaNav }) {
  const now = useNow();
  const calendarToday = toLocalDate(now);
  const { entries, blocks, dayAt } = usePlan(addDays(calendarToday, -1), addDays(calendarToday, 1));
  const today = dayAt(now);
  const kind = dayKind(today, blocks);
  const todays = entriesOn(today, entries, dayAt);
  const work = todays.filter((entry) => entry.kind === 'work');
  const next = todays.find((entry) => entry.kind !== 'work' && (entry.end ?? entry.start) > now);
  const hour = now.getHours();
  const planned = plannedSleepInto(today, entries);

  return (
    <div className="home diaita-home">
      <div className="hero hero--tall diaita-hero">
        <picture>
          <source media="(min-width: 62rem)" srcSet={photoWide} />
          <img className="hero__image" src={photo} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Diaita" mark={<AppMark app="diaita" size={30} light />} light />
          <div className="home__words">
            <p className="home__greeting">{greeting(now)}</p>
            <h1 className="home__title">{DAY_NAMES[kind]}</h1>
            <p className="home__sub">{work.length ? work.map((entry) => `${entry.title} ${span(entry)}`).join(' · ') : 'No work today'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {next && (
          <section className="card diaita-next">
            <span className="card__eyebrow">Next</span>
            <strong className="diaita-next__title">{next.title}</strong>
            <span className="muted">{span(next)}{next.detail ? ` · ${next.detail}` : ''}</span>
          </section>
        )}

        {(hour >= 4 || sleeps.list().some((record) => record.id === today)) && <CheckIn date={today} planned={planned} nav={nav} />}

        <div className="diaita-section-head">
          <h2>Today</h2>
          <button type="button" className="text-link" onClick={() => nav.swap({ name: 'week' })}>Week</button>
        </div>
        <Timeline entries={todays} now={now} />
        <a className="text-link diaita-schedule-link" href="/?open=settings:day">Your schedule in Proairetos</a>
      </div>
    </div>
  );
}
