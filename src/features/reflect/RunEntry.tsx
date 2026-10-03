import { runTitle } from '../../app/askesis/runs';
import type { LogEntry } from '../../askesis/core/log';
import { feelings } from '../../askesis/core/log';
import type { Unit } from '../../askesis/core/pace';
import { MountainIcon } from '../../components/icons/Icons';
import { dayLabel } from './format';

/** A run logged in Askesis, as written there. Opens Askesis to change it. */
export default function RunEntry({ entry, unit, showDay }: { entry: LogEntry; unit: Unit; showDay: boolean }) {
  const time = new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const words = [entry.notes, entry.wentWell && `Went well: ${entry.wentWell}`, entry.nextTime && `Next time: ${entry.nextTime}`]
    .filter(Boolean)
    .join(' ');
  return (
    <li className="timeline-entry">
      <span className="timeline-entry__mark" role="img" aria-label="A run, from Askesis">
        <MountainIcon size={30} />
      </span>
      <div className="timeline-entry__body">
        <div className="timeline-entry__head">
          <span className="timeline-entry__time">{showDay ? `${dayLabel(`${entry.date}T12:00:00`)}, ${time}` : time}</span>
        </div>
        <span className="timeline-entry__prompt">
          From Askesis{entry.felt ? ` · felt ${feelings[entry.felt].toLowerCase()}` : ''}
        </span>
        <a className="timeline-entry__text run-entry__text" href="/askesis/">
          {runTitle(entry, unit)}
          {words && <span className="run-entry__words">{words}</span>}
        </a>
      </div>
    </li>
  );
}
