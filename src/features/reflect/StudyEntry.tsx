import type { StudySession } from '../../app/praxis/study';
import { BookIcon } from '../../components/icons/Icons';
import { dayLabel } from './format';

/** Study recorded in Praxis, as recorded there. Opens Praxis's sessions to change it. */
export default function StudyEntry({ session, showDay }: { session: StudySession; showDay: boolean }) {
  const time = new Date(session.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <li className="timeline-entry">
      <span className="timeline-entry__mark" role="img" aria-label="Study, from Praxis">
        <BookIcon size={30} />
      </span>
      <div className="timeline-entry__body">
        <div className="timeline-entry__head">
          <span className="timeline-entry__time">{showDay ? `${dayLabel(session.at)}, ${time}` : time}</span>
        </div>
        <span className="timeline-entry__prompt">From Praxis</span>
        <a className="timeline-entry__text run-entry__text" href="/praxis/?open=sessions">
          {session.title} · {session.minutes} min
        </a>
      </div>
    </li>
  );
}
