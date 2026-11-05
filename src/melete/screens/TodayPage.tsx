import { Empty } from '../../app/family/shell';
import { BookIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { MeleteNav } from '../app/App';
import { loadRunning, sessions, subjects } from '../app/state';
import { dateFact, formatMinutes, minutesByDay, SESSION_KINDS, sessionsOnDay, upcomingDates } from '../core/subjects';

const time = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** A quick look: today's sittings, the dates coming, minutes so far. Nothing to add here; Subjects and Week hold that. */
export default function TodayPage({ nav }: { nav: MeleteNav }) {
  const list = subjects.use();
  const all = sessions.use();
  const today = toLocalDate(new Date());
  const upcoming = upcomingDates(list, today, 30).slice(0, 4);
  const mine = sessionsOnDay(all, today);
  const minutes = minutesByDay(all, [today])[0];
  const running = loadRunning();
  const nameOf = (id?: string) => list.find((subject) => subject.id === id)?.name;

  return (
    <div className="page melete-page">
      <div className="page-top"><h1 className="title">Today</h1></div>
      {list.length === 0 && <Empty icon={<BookIcon size={28} />} title="No subjects yet" />}
      {running && (
        <section className="card">
          <p className="label">Under way</p>
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'session', id: running.sessionId, subjectId: running.subjectId })}>Open the sitting</button>
        </section>
      )}
      {mine.length > 0 && (
        <section>
          <div className="section-head"><h2>Sittings</h2></div>
          <ul className="chore-list" data-ll-lit>
            {mine.map((session) => (
              <li key={session.id} className="chore">
                <button type="button" className="chore__open" onClick={() => nav.go({ name: 'session', id: session.id })}>
                  <span>{nameOf(session.subjectId) ?? 'Study'}</span>
                  <small>{[SESSION_KINDS.find((kind) => kind.id === session.kind)?.label, session.doneAt ? `${formatMinutes(session.minutes)} kept` : `${time(session.start)} · ${formatMinutes(session.minutes)}`].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
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
        </section>
      )}
      {minutes > 0 && <p className="muted">{formatMinutes(minutes)} studied today</p>}
    </div>
  );
}
