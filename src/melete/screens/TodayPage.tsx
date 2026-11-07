import { Brand } from '../../app/family/shell';
import { DailyLine } from '../../app/family/DailyLine';
import { AppMark } from '../../app/family/icons';
import photoWide from '../../assets/images/scenes/melete-stoic-wide.webp';
import { toLocalDate } from '../../core/scheduling/dates';
import type { MeleteNav } from '../app/App';
import { loadRunning, sessions, subjects } from '../app/state';
import { dateFact, formatMinutes, minutesByDay, sessionsOnDay, upcomingDates } from '../core/subjects';

const time = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** A quick look: today's study sessions, the dates coming, minutes so far. Adding is on Subjects and Week. */
export default function TodayPage({ nav }: { nav: MeleteNav }) {
  const list = subjects.use();
  const all = sessions.use();
  const today = toLocalDate(new Date());
  const upcoming = upcomingDates(list, today, 30).slice(0, 4);
  const mine = sessionsOnDay(all, today);
  const minutes = minutesByDay(all, [today])[0];
  const running = loadRunning();
  const nameOf = (id?: string) => list.find((subject) => subject.id === id)?.name;
  const next = mine.find((session) => !session.doneAt);
  const title = list.length === 0 ? 'Study' : running ? 'Study session in progress' : next ? nameOf(next.subjectId) ?? 'Study' : upcoming[0] ? dateFact(upcoming[0].date, today) : 'Nothing today';

  return (
    <div className="home melete-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <img className="hero__image" src={photoWide} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Meletē" mark={<AppMark app="melete" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{title}</h1>
            {list.length > 0 && next && <p className="home__sub">{time(next.start)} · {formatMinutes(next.minutes)}</p>}
            {list.length > 0 && !next && upcoming[0] && !running && <p className="home__sub">{upcoming[0].subject.name}</p>}
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {list.length === 0 ? (
          <section className="card first-run">
            <h2 className="card__title">No subjects yet</h2>
          </section>
        ) : (
          <>
            {running && (
              <section className="card">
                <button type="button" className="button-main" onClick={() => nav.go({ name: 'session', id: running.sessionId, subjectId: running.subjectId })}>Open study session</button>
              </section>
            )}
            {mine.length > 0 && (
              <>
                <div className="section-head"><h2>Study sessions</h2></div>
                <ul className="chore-list" data-ll-lit>
                  {mine.map((session) => (
                    <li key={session.id} className="chore">
                      <button type="button" className="chore__open" onClick={() => nav.go({ name: 'session', id: session.id })}>
                        <span>{nameOf(session.subjectId) ?? 'Study'}</span>
                        <small>{session.doneAt ? `${formatMinutes(session.minutes)} logged` : `${time(session.start)} · ${formatMinutes(session.minutes)}`}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <div className="section-head"><h2>Coming up</h2></div>
                <ul className="chore-list">
                  {upcoming.map(({ subject, date }) => (
                    <li key={date.id} className="chore">
                      <button type="button" className="chore__open" onClick={() => nav.go({ name: 'subject', id: subject.id })}>
                        <span>{dateFact(date, today)}</span>
                        <small>{subject.name}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {minutes > 0 && <p className="muted">{formatMinutes(minutes)} studied today</p>}
            <DailyLine app="melete" />
          </>
        )}
      </div>
    </div>
  );
}
