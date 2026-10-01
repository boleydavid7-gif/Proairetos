import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { compassService, decisionService, lifeService, scheduleService } from '../../app/services';
import { observePeriod, type ObservationKind } from '../../core/reflections/observations';
import { insightRange, type InsightPeriod } from '../../core/reflections/insights';
import { hiddenObservationKinds, setHiddenObservationKinds } from '../../data/storage/preferences';

async function load(period: InsightPeriod) {
  const now = new Date();
  const range = insightRange(period, now);
  const [items, events, decisions, values, occurrences] = await Promise.all([
    lifeService.list(),
    lifeService.historyForAll(),
    decisionService.list(),
    compassService.values(),
    // All time would mean expanding a repeating schedule without end; a year back is plenty.
    period === 'all'
      ? scheduleService.occurrencesBetween(new Date(now.getTime() - 365 * 86_400_000), now)
      : scheduleService.occurrencesBetween(range.start, range.end),
  ]);
  return observePeriod({ range, now, items, events, decisions, values, occurrences });
}

// Any of these services changing can change the facts.
function subscribeAll(listener: () => void) {
  const unsubscribers = [lifeService, decisionService, compassService, scheduleService].map((s) => s.subscribe(listener));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/** What happened in the period, as plain facts. The person decides what any of it means. */
export default function Observations({ period }: { period: InsightPeriod }) {
  const observations = useServiceData(subscribeAll, () => load(period), [period]);
  const [hidden, setHidden] = useState<string[]>(() => hiddenObservationKinds());

  if (!observations) return null;
  const shown = observations.filter((o) => !hidden.includes(o.kind));
  const hiddenHere = observations.length - shown.length;

  const update = (kinds: string[]) => {
    setHidden(kinds);
    setHiddenObservationKinds(kinds);
  };
  const hide = (kind: ObservationKind) => update([...hidden, kind]);

  return (
    <section className="stack-tight" aria-label="What happened">
      <h2 className="section-label">What happened</h2>
      {observations.length === 0 && <p className="empty-note">Nothing recorded in this period yet.</p>}
      {shown.length > 0 && (
        <ul className="observations">
          {shown.map((observation) => (
            <li key={observation.kind} className="observation">
              <div className="observation__text">
                <span className="observation__title">{observation.text}</span>
                {observation.detail && <span className="observation__detail">{observation.detail}</span>}
              </div>
              <button
                type="button"
                className="observation__hide"
                aria-label={`Hide "${observation.text}"`}
                onClick={() => hide(observation.kind)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {hiddenHere > 0 && (
        <button type="button" className="text-link observations__restore" onClick={() => update([])}>
          Show {hiddenHere} hidden
        </button>
      )}
    </section>
  );
}
