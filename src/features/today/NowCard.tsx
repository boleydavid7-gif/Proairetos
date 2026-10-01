import { useOverlays } from '../../app/overlays/OverlayContext';
import { ClockIcon } from '../../components/icons/Icons';
import type { LifeItem } from '../../core/life-items/types';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { formatTimeOf } from '../schedule/format';
import { blockTitle, formatDuration, nowStatus } from './timeline';

type Props = {
  now: Date;
  occurrences: ScheduleOccurrence[];
  items: LifeItem[];
};

/** Where you are in time right now. Plain facts, updated live. */
export default function NowCard({ now, occurrences, items }: Props) {
  const { openItem } = useOverlays();
  const { current, next } = nowStatus(now, occurrences, items);
  if (!current && !next) return null;

  return (
    <section className="now-card" aria-label="Now">
      {current && (
        <div className="now-card__current">
          <span className={`kind-dot kind-dot--${current.kind.toLowerCase()}`} aria-hidden="true" />
          <div>
            <p className="now-card__title">{blockTitle(current)}</p>
            <p className="now-card__detail">
              Until {formatTimeOf(current.end)} · {formatDuration(current.end.getTime() - now.getTime())} left
            </p>
          </div>
        </div>
      )}
      {next && (
        <button
          type="button"
          className="now-card__next"
          disabled={!next.item}
          onClick={() => next.item && openItem(next.item.id)}
        >
          <ClockIcon size={20} />
          <span>
            <span className="now-card__label">Next</span> {next.title}
          </span>
          <span className="now-card__when">
            in {formatDuration(next.start.getTime() - now.getTime())}
            <span className="now-card__at"> · {formatTimeOf(next.start)}</span>
          </span>
        </button>
      )}
    </section>
  );
}
