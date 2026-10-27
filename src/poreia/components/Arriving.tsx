import type { PoreiaNav } from '../app/App';
import { docs, today } from '../app/state';
import { docsFor, expiryFact, needsLook } from '../core/documents';
import type { Trip } from '../core/model';

/** The trip's documents, with any that end before or near it first; opens Documents. */
export function DocumentsCard({ trip, nav }: { trip: Trip; nav: PoreiaNav }) {
  const mine = docsFor(docs.use(), trip.id);
  const near = mine.filter((doc) => needsLook(doc, trip, today()));
  return (
    <section className="card">
      <h2 className="card__title">Documents</h2>
      {mine.length ? (
        <ul className="poreia-plain-list">
          {[...near, ...mine.filter((doc) => !near.includes(doc))].map((doc) => {
            const fact = expiryFact(doc, trip, today());
            return (
              <li key={doc.id}>
                {doc.name}
                {fact && <span className={near.includes(doc) ? 'muted poreia-doc__fact is-near' : 'muted'}> · {fact}</span>}
              </li>
            );
          })}
        </ul>
      ) : null}
      <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'documents', tripId: trip.id })}>
        {mine.length ? 'Open documents' : 'Add a passport, visa or insurance'}
      </button>
    </section>
  );
}
