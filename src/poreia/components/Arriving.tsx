import { useEffect, useState } from 'react';
import type { PoreiaNav } from '../app/App';
import { docs, settings, today } from '../app/state';
import { countryFacts, tippingIn } from '../app/world';
import { adviceFor, emergencyIn, emergencyLines, plugNote, powerIn } from '../core/arriving';
import { docsFor, expiryFact, needsLook } from '../core/documents';
import type { Place, Trip } from '../core/model';

const regionHere = () => {
  try {
    return new Intl.Locale(navigator.language).maximize().region;
  } catch {
    return undefined;
  }
};

/** Arriving at a place: emergency numbers, plugs and current, entry rules from home's government, tipping. */
export function ArrivingCard({ place }: { place: Place }) {
  const home = settings.use().home?.countryCode ?? regionHere();
  const there = place.countryCode?.toUpperCase();
  const numbers = emergencyIn(there);
  const power = powerIn(there);
  const abroad = Boolean(there && home && there !== home.toUpperCase());
  const advice = adviceFor(home);
  const [tipping, setTipping] = useState<{ text: string; url: string }>();
  useEffect(() => {
    setTipping(undefined);
    if (!there) return;
    let live = true;
    countryFacts(there)
      .then((facts) => (facts ? tippingIn(facts.name) : undefined))
      .then((found) => live && setTipping(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [there]);
  if (!numbers && !power && !abroad && !tipping) return null;
  const note = power && abroad ? plugNote(powerIn(home), power) : undefined;

  return (
    <div className="poreia-arriving">
      <p className="label">Arriving</p>
      <dl className="detail-list">
        {numbers && (
          <>
            <dt>Emergency</dt>
            <dd>
              {emergencyLines(numbers).map((line) => (
                <span key={line} className="poreia-arriving__line">
                  {line}
                </span>
              ))}
            </dd>
          </>
        )}
        {power && (
          <>
            <dt>Plugs</dt>
            <dd>
              <span className="poreia-arriving__line">
                Type {power.plugs} · {power.volts} V, {power.hertz} Hz
              </span>
              {note && <span className="poreia-arriving__line muted">{note}</span>}
            </dd>
          </>
        )}
        {abroad && (
          <>
            <dt>Entry rules</dt>
            <dd>
              <a href={advice.url} target="_blank" rel="noopener noreferrer">
                {advice.name}
              </a>
            </dd>
          </>
        )}
      </dl>
      {tipping && (
        <>
          <p className="label">Tipping</p>
          <p className="poreia-arriving__tipping">{tipping.text}</p>
          <p className="fine">
            From{' '}
            <a href={tipping.url} target="_blank" rel="noopener noreferrer">
              Wikivoyage
            </a>{' '}
            (CC BY-SA).
          </p>
        </>
      )}
    </div>
  );
}

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
