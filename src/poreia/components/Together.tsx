import { RollingNumber } from '../../lamplight/RollingNumber';
import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { Sym } from '../../lamplight/icons';
import { myName, trips } from '../app/state';
import { moneyText, type Trip } from '../core/model';
import type { Balance, Transfer } from '../core/split';

/** The people on a trip, by name: the person first. */
export const peopleOf = (trip: Trip): string[] => (trip.people?.length ? trip.people : [myName()]);

/**
 * Who is going (names, for who paid what). The organizer stays local; no account or sharing service is required.
 */
export function TogetherCard({ trip }: { trip: Trip }) {
  const people = peopleOf(trip);
  const [name, setName] = useState('');
  // Travelers follow the names once there are two or more, so who is going is said once.
  const setPeople = (next: string[]) => trips.put({ ...trip, people: next, travelers: next.length > 1 ? next.length : trip.travelers, updatedAt: new Date().toISOString() });

  const add = () => {
    const clean = name.trim();
    if (!clean || people.some((each) => each.toLowerCase() === clean.toLowerCase())) return;
    setPeople([...people, clean]);
    setName('');
  };

  return (
    <section className="card poreia-together">
      <h2 className="card__title">Travel together</h2>
      <ul className="poreia-people" aria-label="Who is going">
        {people.map((person, index) => (
          <li key={person} className="chip">
            {person}
            {index > 0 && (
              <button
                type="button"
                className="poreia-people__remove"
                aria-label={`Take ${person} off the trip`}
                onClick={() => {
                  setPeople(people.filter((each) => each !== person));
                  offerUndo(`${person} taken off`, () => trips.put(trip));
                }}
              >
                <Sym name="close" size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="add-line"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input className="input" value={name} placeholder="Add someone" aria-label="Add someone to the trip" onChange={(event) => setName(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!name.trim()}>
          Add
        </button>
      </form>

    </section>
  );
}

/** Who paid what against an even share, and the fewest payments that even it out. */
export function Balances({ list, transfers, currency, leftOut }: { list: Balance[]; transfers: Transfer[]; currency: string; leftOut: number }) {
  if (!list.some((each) => each.paid)) return null;
  return (
    <section className="card">
      <h2 className="card__title">Who paid</h2>
      <dl className="detail-list">
        {list.map((each) => (
          <span key={each.person} style={{ display: 'contents' }}>
            <dt>{each.person}</dt>
            <dd className="poreia-balance">
              <span>Paid <RollingNumber key={currency} value={each.paid} format={(cents) => moneyText({ cents: Math.round(cents), currency })} /></span>
              <span className="muted">Share {moneyText({ cents: each.share, currency })}</span>
            </dd>
          </span>
        ))}
      </dl>
      {transfers.length > 0 ? (
        <ul className="poreia-settle">
          {transfers.map((transfer) => (
            <li key={`${transfer.from}-${transfer.to}`}>
              {transfer.from} → {transfer.to}: <strong><RollingNumber key={currency} value={transfer.cents} format={(cents) => moneyText({ cents: Math.round(cents), currency })} /></strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Even.</p>
      )}
      {leftOut > 0 && <p className="fine">{leftOut === 1 ? '1 payment has' : `${leftOut} payments have`} no one marked as paying, or no rate yet, and {leftOut === 1 ? 'is' : 'are'} left out.</p>}
    </section>
  );
}
