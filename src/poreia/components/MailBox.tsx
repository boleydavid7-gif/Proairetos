import { useEffect, useState, useSyncExternalStore } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { syncStatus } from '../../app/sync/syncController';
import type { PoreiaNav } from '../app/App';
import { addressFor, mailHere, openMail, turnOffMail, turnOnMail } from '../app/mailInbox';
import { bookings, mails, newId, nowStamp, today, trips } from '../app/state';
import { datesText } from '../app/ui';
import { alreadyThere, bookingFrom, readMail, tripFor, type ArrivedMail } from '../core/mail';
import { kindLabel, type Booking, type Trip } from '../core/model';

/** Places each email that arrived on its trip, or keeps it to place by hand; one undo for what was added. */
function placeArrived(list: ReturnType<typeof readMail>[], raw: Parameters<Parameters<typeof openMail>[0]>[0][]): void {
  const added: Booking[] = [];
  const waiting: ArrivedMail[] = [];
  const day = today();
  raw.forEach((mail, index) => {
    const read = list[index];
    const trip = tripFor(read, trips.list(), `${mail.s}\n${mail.t}`, day);
    const theirs = trip ? bookings.list().filter((each) => each.tripId === trip.id) : [];
    if (trip && read && read.startDate && !alreadyThere(read, theirs)) {
      const booking = bookingFrom(read, trip.id, mail.s, newId(), nowStamp());
      bookings.put(booking);
      added.push(booking);
    } else if (!(trip && read && alreadyThere(read, theirs))) {
      waiting.push({ id: newId(), subject: mail.s, from: mail.f, at: mail.at, read, excerpt: mail.t.slice(0, 1500) });
    }
  });
  waiting.forEach((each) => mails.put(each));
  if (added.length) {
    const first = added[0];
    const tripName = trips.get(first.tripId)?.name ?? 'its trip';
    offerUndo(added.length === 1 ? `“${first.title}” added to ${tripName}` : `${added.length} bookings added from your email`, () => added.forEach((each) => bookings.remove(each.id)));
  } else if (waiting.length) {
    say(waiting.length === 1 ? 'An email came in to place on a trip' : `${waiting.length} emails came in to place on trips`);
  }
}

/** Opens the forwarding inbox on start, when sync is ready and on coming back into view. */
export function useMailOpener(): void {
  useEffect(() => {
    if (!mailHere()) return;
    const open = async () => {
      if (document.visibilityState !== 'visible') return;
      const raw: Parameters<Parameters<typeof openMail>[0]>[0][] = [];
      await openMail((mail) => raw.push(mail)).catch(() => []);
      if (raw.length) placeArrived(raw.map((mail) => readMail(mail)), raw);
    };
    void open();
    const stop = syncStatus.subscribe(() => syncStatus.get().phase === 'ready' && void open());
    document.addEventListener('visibilitychange', open);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', open);
    };
  }, []);
}

const readLine = (mail: ArrivedMail) =>
  mail.read ? [kindLabel(mail.read.kind), mail.read.provider, mail.read.startDate ? datesText(mail.read.startDate, mail.read.endDate) : undefined, mail.read.confirmation].filter(Boolean).join(' · ') : 'No booking found in it';

/** Emails waiting to be placed: choose a trip, start one from it, or let it go (with undo). */
export function ArrivedMails({ nav }: { nav: PoreiaNav }) {
  const waiting = mails.use().sort((a, b) => b.at.localeCompare(a.at));
  const list = trips.use();
  if (!waiting.length) return null;
  return (
    <section className="card">
      <h2 className="card__title">From your email</h2>
      <ul className="rows poreia-mail">
        {waiting.map((mail) => (
          <MailRow key={mail.id} mail={mail} list={list} nav={nav} />
        ))}
      </ul>
    </section>
  );
}

function MailRow({ mail, list, nav }: { mail: ArrivedMail; list: Trip[]; nav: PoreiaNav }) {
  const day = today();
  const choices = list.filter((trip) => !trip.end || trip.end >= day).sort((a, b) => (a.start ?? '9').localeCompare(b.start ?? '9'));
  const [tripId, setTripId] = useState(choices[0]?.id ?? '');
  const remove = () => {
    mails.remove(mail.id);
    offerUndo(`“${mail.subject || 'Email'}” removed`, () => mails.put(mail));
  };
  const addTo = (trip: Trip) => {
    const booking = bookingFrom(mail.read!, trip.id, mail.subject, newId(), nowStamp());
    bookings.put(booking);
    mails.remove(mail.id);
    offerUndo(`“${booking.title}” added to ${trip.name}`, () => {
      bookings.remove(booking.id);
      mails.put(mail);
    });
  };
  return (
    <li className="poreia-mail__row">
      <div className="row__text">
        <span>{mail.subject || 'Email'}</span>
        <span className="row__detail">{readLine(mail)}</span>
        {mail.from && <span className="fine">From {mail.from}</span>}
      </div>
      {mail.read && choices.length > 0 && (
        <div className="input-row">
          <label className="field">
            <span className="field__label">Trip</span>
            <select className="input" value={tripId} onChange={(event) => setTripId(event.target.value)}>
              {choices.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="button-row">
        {mail.read && choices.length > 0 && (
          <button type="button" className="button-quiet" onClick={() => trips.get(tripId) && addTo(trips.get(tripId)!)}>
            Add to trip
          </button>
        )}
        {mail.read && (
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const now = nowStamp();
              const read = mail.read!;
              const trip: Trip = { id: newId(), name: read.to ?? read.title ?? 'New trip', start: read.startDate, end: read.endDate ?? read.startDate, travelers: 1, stage: 'idea', createdAt: now, updatedAt: now };
              trips.put(trip);
              addTo(trip);
              nav.go({ name: 'trip', id: trip.id });
            }}
          >
            New trip from it
          </button>
        )}
        <button type="button" className="text-link" onClick={remove}>
          Remove
        </button>
      </div>
    </li>
  );
}

/** More's card: the person's forwarding address, with Copy, a new address, and Turn off. */
export function ForwardingCard() {
  const [kept, setKept] = useState(mailHere());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const status = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const ready = status.phase === 'ready';
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setProblem('');
    try {
      await work();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Couldn’t do that. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card">
      <h2 className="card__title">Forward booking emails</h2>
      {kept ? (
        <>
          <p className="poreia-mail__address">{addressFor(kept.token)}</p>
          <div className="button-row">
            <button
              type="button"
              className="button-quiet"
              onClick={() => {
                void navigator.clipboard?.writeText(addressFor(kept.token)).then(() => say('Address copied'));
              }}
            >
              Copy
            </button>
            <button type="button" className="text-link" disabled={busy} onClick={() => void run(async () => setKept(await turnOnMail()))}>
              New address
            </button>
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await turnOffMail();
                  setKept(undefined);
                })
              }
            >
              Turn off
            </button>
          </div>
          <p className="fine">Forward a confirmation from an airline, hotel, rental or ticket site. It lands on the trip whose dates it fits, or under From your email on Trips. Sealed for this device before it is kept.</p>
        </>
      ) : (
        <>
          <p className="muted">An address to forward confirmations to; each becomes a booking on its trip.</p>
          <button type="button" className="button-quiet" disabled={busy || !ready} onClick={() => void run(async () => setKept(await turnOnMail()))}>
            Make my address
          </button>
          {!ready && <p className="fine">Sign in and open your data above first.</p>}
        </>
      )}
      {problem && <p className="muted">{problem}</p>}
    </section>
  );
}
