import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { occurrenceKey } from '../../core/rhythm/rhythm';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { answerPauseOffer } from '../../data/storage/preferences';
import { formatTimeOf } from '../schedule/format';
import { blockTitle } from '../today/timeline';

/** Offered only for patterns where the person turned it on. Asked once per block. */
export default function PauseOfferCard({ occurrence }: { occurrence: ScheduleOccurrence }) {
  const { openPause } = useOverlays();
  const [answered, setAnswered] = useState(false);
  if (answered) return null;

  const answer = (start: boolean) => {
    answerPauseOffer(occurrenceKey(occurrence));
    setAnswered(true);
    if (start) openPause();
  };

  return (
    <section className="pause-offer" aria-label="Pause">
      <p className="pause-offer__text">
        {blockTitle(occurrence)} ended at {formatTimeOf(occurrence.end)}. A minute to arrive?
      </p>
      <div className="chip-row">
        <button type="button" className="chip chip--accent" onClick={() => answer(true)}>
          Take a minute
        </button>
        <button type="button" className="button-quiet" onClick={() => answer(false)}>
          Not now
        </button>
      </div>
    </section>
  );
}
