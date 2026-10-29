import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import type { PoreiaNav } from '../app/App';
import { trips } from '../app/state';
import { phaseOf, type Trip } from '../core/model';

/** Back from a trip in the last two weeks: one line to keep in Proairetos's Reflect (optional), offered once. */
export default function LookBack({ list, today, nav }: { list: readonly Trip[]; today: string; nav: PoreiaNav }) {
  const trip = list.find((each) => {
    const phase = phaseOf(each, today);
    return phase.kind === 'past' && phase.daysAgo <= 14 && !each.lookedBack;
  });
  const [line, setLine] = useState('');
  if (!trip) return null;
  const done = () => trips.put({ ...trip, lookedBack: true, updatedAt: new Date().toISOString() });

  const keep = async () => {
    if (!line.trim()) return;
    // Proairetos's own records load only now, so Poreia's first load stays its own.
    const { reflectionService } = await import('../../app/services');
    const reflection = await reflectionService.write({ body: `${trip.name}: ${line.trim()}`, kind: 'FREE', promptKey: 'after-trip' });
    done();
    offerUndo('Kept in Reflect', () => {
      void reflectionService.remove(reflection.id);
      trips.put(trip);
    });
  };

  return (
    <section className="card">
      <h2 className="card__title">Back from {trip.name}</h2>
      <form
        className="add-line"
        onSubmit={(event) => {
          event.preventDefault();
          void keep();
        }}
      >
        <input className="input" aria-label="A line to keep in Reflect" value={line} onChange={(event) => setLine(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!line.trim()}>
          Save
        </button>
      </form>
      <div className="button-row">
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip', id: trip.id, view: 'money' })}>
          What it cost
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            done();
            offerUndo('Set aside', () => trips.put(trip));
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}
