import { RollingNumber } from '../../lamplight/RollingNumber';
import { useState } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { Sym } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';
import type { PoreiaNav } from '../app/App';
import { inviteLink, joinTrip, leaveTrip, listOfTrip, pendingInvite, setInviteAside, shareTrip, sharingAvailable } from '../app/sharedTrips';
import { myName, trips } from '../app/state';
import { moneyText, type Trip } from '../core/model';
import type { Balance, Transfer } from '../core/split';

/** The people on a trip, by name: the person first. */
export const peopleOf = (trip: Trip): string[] => (trip.people?.length ? trip.people : [myName()]);

/**
 * Who is going (names, for who paid what), and the trip shared with them: an invite link, kept in step on every phone
 * that joins. Sharing needs an account; the names work without one.
 */
export function TogetherCard({ trip }: { trip: Trip }) {
  const people = peopleOf(trip);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const list = listOfTrip(trip);
  // Travelers follow the names once there are two or more, so who is going is said once.
  const setPeople = (next: string[]) => trips.put({ ...trip, people: next, travelers: next.length > 1 ? next.length : trip.travelers, updatedAt: new Date().toISOString() });

  const add = () => {
    const clean = name.trim();
    if (!clean || people.some((each) => each.toLowerCase() === clean.toLowerCase())) return;
    setPeople([...people, clean]);
    setName('');
  };

  const invite = async () => {
    if (!list) return;
    const link = inviteLink(location.origin, list);
    try {
      if (navigator.share) await navigator.share({ title: trip.name, text: `${trip.name} in Poreia`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        say('Invite link copied');
      }
    } catch {
      // Closed without sharing.
    }
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

      {sharingAvailable &&
        (list ? (
          <>
            <p className="muted">Shared. Everyone on it can make changes.</p>
            <div className="button-row">
              <button type="button" className="button-quiet" onClick={invite}>
                Invite someone
              </button>
              <button
                type="button"
                className="text-link"
                onClick={async () => {
                  await leaveTrip(trip).catch(() => undefined);
                  say('Stopped sharing. The trip stays here.');
                }}
              >
                Stop sharing here
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="button-quiet"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setProblem('');
                try {
                  await shareTrip(trip);
                } catch (error) {
                  setProblem(error instanceof Error && /Sign in/.test(error.message) ? 'Sign in under More to share a trip.' : error instanceof Error ? error.message : 'Couldn’t share the trip. Try again.');
                }
                setBusy(false);
              }}
            >
              {busy ? <Waiting>Sharing…</Waiting> : 'Share this trip'}
            </button>
            {problem && <p className="muted">{problem}</p>}
          </>
        ))}
    </section>
  );
}

/** A trip someone shared, from its invite link: join it here, or set it aside. */
export function InviteCard({ nav }: { nav: PoreiaNav }) {
  const [invite, setInvite] = useState(pendingInvite);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  if (!invite) return null;
  return (
    <section className="card poreia-invite">
      <h2 className="card__title">Join “{invite.name}”</h2>
      <p className="muted">Shared with you. Join to see and change its days, bookings, packing and spending.</p>
      <div className="button-row">
        <button
          type="button"
          className="button-main"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setProblem('');
            try {
              const id = await joinTrip(invite);
              setInviteAside();
              setInvite(undefined);
              if (id) nav.go({ name: 'trip', id });
            } catch (error) {
              setProblem(error instanceof Error && /Sign in/.test(error.message) ? 'Sign in under More, then open the link again.' : error instanceof Error ? error.message : 'Couldn’t join. Try again.');
            }
            setBusy(false);
          }}
        >
          {busy ? <Waiting>Joining…</Waiting> : 'Join the trip'}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setInviteAside();
            setInvite(undefined);
          }}
        >
          Not now
        </button>
      </div>
      {problem && <p className="muted">{problem}</p>}
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
