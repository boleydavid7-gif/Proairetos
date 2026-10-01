import { useClock } from '../../app/hooks/useClock';
import { formatClockDown, isFinished, remainingMs, type FocusSession } from '../../core/focus/session';

type Props = {
  session: FocusSession;
  onOpen: () => void;
};

/** A small reminder above the tab bar while a focus stretch runs in the background. */
export default function FocusBar({ session, onOpen }: Props) {
  const now = useClock(1000).getTime();
  const finished = isFinished(session, now);

  return (
    <button type="button" className="focus-bar" onClick={onOpen}>
      <span className="focus-bar__dot" aria-hidden="true" />
      <span className="focus-bar__label">
        {finished ? 'Focus time is up' : session.pausedAt ? 'Focus paused' : 'Focus'}
        {session.itemTitle && <span className="focus-bar__item"> · {session.itemTitle}</span>}
      </span>
      {!finished && <span className="focus-bar__time">{formatClockDown(remainingMs(session, now))}</span>}
    </button>
  );
}
