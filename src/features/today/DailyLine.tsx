import { useState } from 'react';
import type { StoicLine } from '../../core/stoic/dailyLine';

/** The day's line. Tapping it turns it over to one way to try it today; tapping again turns it back. */
export default function DailyLine({ line }: { line: StoicLine }) {
  const [turned, setTurned] = useState(false);
  const canTurn = Boolean(line.tryIt);

  return (
    <figure className="today-header__line">
      <button
        type="button"
        className="daily-line"
        disabled={!canTurn}
        aria-expanded={canTurn ? turned : undefined}
        aria-label={turned ? undefined : canTurn ? `${line.text} Tap for a way to try it today.` : undefined}
        onClick={() => setTurned(!turned)}
      >
        {turned ? (
          <span className="daily-line__try">
            <span className="daily-line__label">Try it today</span>
            {line.tryIt}
          </span>
        ) : (
          <blockquote>{line.text}</blockquote>
        )}
      </button>
      {!turned && line.source && <figcaption>{line.source}</figcaption>}
    </figure>
  );
}
