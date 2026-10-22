import { useEffect, useState } from 'react';
import { isAdded } from '../../app/family/added';
import { offerUndo } from '../../app/family/shell';
import type { CompassStatement } from '../../core/compass/types';
import type { Envelope } from '../../oikonomia/core/envelopes';
import { links, linksOf, setLinks, settings, today } from '../app/state';
import { MoneyField } from '../app/ui';
import { moneyText, phaseOf, type Trip } from '../core/model';

type Apps = typeof import('../app/goalsAndSaving');
const useApps = (on = true) => {
  const [apps, setApps] = useState<Apps>();
  useEffect(() => {
    if (on) void import('../app/goalsAndSaving').then(setApps);
  }, [on]);
  return apps;
};

/** The trip as a goal in Compass ("Working toward"), and marked reached after it, when the person asks. */
export function GoalCard({ trip }: { trip: Trip }) {
  const apps = useApps();
  const linked = links.use()[trip.id]?.goalId;
  const [goal, setGoal] = useState<CompassStatement | null>();
  const [words, setWords] = useState(`Go to ${trip.place?.name ?? trip.name}`);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!apps) return;
    void apps.goalOf(trip).then((found) => setGoal(found ?? null)).catch(() => setGoal(null));
  }, [apps, linked, round]);
  if (!apps || goal === undefined) return null;
  const past = phaseOf(trip, today()).kind === 'past';

  if (!goal) {
    if (past) return null;
    return (
      <section className="card">
        <h2 className="card__title">Add to Compass</h2>
        <input className="input" aria-label="Goal" value={words} onChange={(event) => setWords(event.target.value)} />
        <button
          type="button"
          className="button-quiet"
          onClick={async () => {
            const undo = await apps.addGoal(trip, words);
            offerUndo('Added to Compass', () => void undo().then(() => setRound((count) => count + 1)));
          }}
        >
          Add to Compass
        </button>
      </section>
    );
  }
  return (
    <section className="card">
      <h2 className="card__title">In Compass</h2>
      <p className="poreia-goal">{goal.body}</p>
      <p className="muted">{goal.reachedAt ? 'Reached' : 'Working toward'}</p>
      {past && !goal.reachedAt && (
        <button
          type="button"
          className="button-quiet"
          onClick={async () => {
            const undo = await apps.markReached(goal.id, true);
            setRound((count) => count + 1);
            offerUndo('Marked reached', () => void undo().then(() => setRound((count) => count + 1)));
          }}
        >
          Mark it reached
        </button>
      )}
    </section>
  );
}

/**
 * Saving toward the trip: in an Oikonomia envelope when Oikonomia is added (made for the trip, or one already saving
 * for it), else a plain amount kept here.
 */
export function SavingCard({ trip }: { trip: Trip }) {
  const withOikonomia = isAdded('oikonomia');
  if (phaseOf(trip, today()).kind === 'past') return null;
  return withOikonomia ? <EnvelopeCard trip={trip} /> : <SavedHere trip={trip} />;
}

function AddMoney({ currency, onAdd }: { currency: string; onAdd: (cents: number) => void }) {
  const [cents, setCents] = useState<number>();
  const [round, setRound] = useState(0);
  return (
    <div className="poreia-saving__add">
      <MoneyField key={round} label="Amount" cents={cents} currency={currency} onChange={(value) => setCents(value)} />
      <button
        type="button"
        className="button-quiet"
        disabled={!cents}
        onClick={() => {
          onAdd(cents!);
          setCents(undefined);
          setRound((count) => count + 1);
        }}
      >
        Add
      </button>
    </div>
  );
}

function Progress({ saved, target, currency }: { saved: number; target?: number; currency: string }) {
  return (
    <>
      <p className="poreia-money-card__total">{moneyText({ cents: saved, currency })}</p>
      {target ? (
        <>
          <p className="muted">
            of {moneyText({ cents: target, currency })}
            {saved < target ? ` · ${moneyText({ cents: target - saved, currency })} to go` : ''}
          </p>
          <div className="poreia-saving__bar" role="img" aria-label={`${moneyText({ cents: saved, currency })} of ${moneyText({ cents: target, currency })}`}>
            <span style={{ width: `${Math.min(100, (saved / target) * 100)}%` }} />
          </div>
        </>
      ) : null}
    </>
  );
}

function SavedHere({ trip }: { trip: Trip }) {
  links.use();
  const currency = trip.budget?.currency ?? settings.load().currency;
  const saved = linksOf(trip.id).saved;
  const amount = saved && saved.currency === currency ? saved.cents : 0;
  return (
    <section className="card">
      <h2 className="card__title">Saved for it</h2>
      <Progress saved={amount} target={trip.budget?.cents} currency={currency} />
      <AddMoney
        currency={currency}
        onAdd={(cents) => {
          const undo = setLinks(trip.id, { saved: { cents: amount + cents, currency } });
          offerUndo(`${moneyText({ cents, currency })} added`, undo);
        }}
      />
    </section>
  );
}

function EnvelopeCard({ trip }: { trip: Trip }) {
  const apps = useApps();
  const linked = links.use()[trip.id]?.envelopeId;
  const [envelope, setEnvelope] = useState<Envelope | null>();
  const [choices, setChoices] = useState<Envelope[]>([]);
  const [round, setRound] = useState(0);
  const again = () => setRound((count) => count + 1);
  useEffect(() => {
    if (!apps) return;
    void apps.envelopeOf(trip).then((found) => setEnvelope(found ?? null)).catch(() => setEnvelope(null));
    void apps.freeEnvelopes().then(setChoices).catch(() => setChoices([]));
  }, [apps, linked, round, trip.updatedAt]);
  // What Oikonomia does to the envelope (money in, a new target) shows here as it happens.
  useEffect(() => (apps ? apps.watchEnvelopes(again) : undefined), [apps]);
  if (!apps || envelope === undefined) return null;
  const currency = trip.budget?.currency ?? settings.load().currency;

  if (!envelope) {
    return (
      <section className="card">
        <h2 className="card__title">Save for it in Oikonomia</h2>
        <button
          type="button"
          className="button-quiet"
          onClick={async () => {
            const undo = await apps.makeEnvelope(trip, currency);
            again();
            offerUndo('Envelope made in Oikonomia', () => void undo().then(again));
          }}
        >
          Make an envelope for this trip
        </button>
        {choices.length > 0 && (
          <label className="field">
            <span className="field__label">Or use one you have</span>
            <select
              className="input"
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                const undo = apps.linkEnvelope(trip, event.target.value);
                offerUndo('Envelope linked', undo);
              }}
            >
              <option value="">Choose an envelope</option>
              {choices.map((each) => (
                <option key={each.id} value={each.id}>
                  {each.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
    );
  }
  return (
    <section className="card">
      <h2 className="card__title">{envelope.name}, in Oikonomia</h2>
      <Progress saved={envelope.balanceCents} target={envelope.targetCents || undefined} currency={envelope.currency} />
      <AddMoney
        currency={envelope.currency}
        onAdd={async (cents) => {
          const undo = await apps.addToEnvelope(envelope, cents, trip.name);
          again();
          offerUndo(`${moneyText({ cents, currency: envelope.currency })} added`, () => void undo().then(again));
        }}
      />
      <div className="button-row">
        <a className="text-link" href="/oikonomia/?open=envelopes">
          Open Oikonomia
        </a>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            const undo = apps.linkEnvelope(trip, undefined);
            offerUndo('Envelope unlinked; it stays in Oikonomia', undo);
          }}
        >
          Unlink
        </button>
      </div>
    </section>
  );
}

/**
 * With Oikonomia added, keeps the trip and its envelope in step while the trip is open: the envelope is made the first
 * time, and changes on either side pass to the other (`syncEnvelope`).
 */
export function useEnvelopeSync(trip: Trip | undefined): void {
  const on = isAdded('oikonomia') && Boolean(trip);
  const apps = useApps(on);
  const currency = settings.use().currency;
  const key = trip ? `${trip.id}|${trip.name}|${trip.budget?.cents ?? ''}|${trip.budget?.currency ?? ''}|${trip.start ?? ''}` : '';
  useEffect(() => {
    if (!apps || !trip) return;
    const run = () => void apps.syncEnvelope(trip, currency).catch(() => undefined);
    run();
    return apps.watchEnvelopes(run);
  }, [apps, key, currency]);
}
