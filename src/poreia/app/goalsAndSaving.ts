import { compassService } from '../../app/services';
import type { CompassStatement } from '../../core/compass/types';
import { addEnvelopeEntry, newEnvelope, type Envelope } from '../../oikonomia/core/envelopes';
import { deleteEnvelope, getEnvelope, listEnvelopes, putEnvelope, subscribe as subscribeOikonomia } from '../../oikonomia/data/store';
import { onRemoteChanges } from '../../app/sync/syncController';
import { planEnvelopeSync, type EnvelopeSide } from '../core/envelopeSync';
import { phaseOf, type Trip } from '../core/model';
import { linksOf, newId, setLinks, today, trips } from './state';

/*
 * A trip with Compass and Oikonomia, each only when added and only when asked: the trip as a goal in Compass
 * ("Working toward"), marked reached when the person says so, and an Oikonomia envelope saving toward it. Loaded only
 * when a trip page asks.
 */

// ---------- Compass ----------

export async function goalOf(trip: Trip): Promise<CompassStatement | undefined> {
  const id = linksOf(trip.id).goalId;
  if (!id) return undefined;
  return (await compassService.statements()).find((each) => each.id === id && each.type === 'GOAL');
}

/** The trip as a Compass goal; gives back an undo that takes it away again. */
export async function addGoal(trip: Trip, words: string): Promise<() => Promise<void>> {
  const goal = await compassService.addGoal(words.trim() || trip.name);
  const undoLink = setLinks(trip.id, { goalId: goal.id });
  return async () => {
    undoLink();
    await compassService.removeStatement(goal.id);
  };
}

/** Marks the goal reached (or not); gives back the undo. */
export async function markReached(goalId: string, reached: boolean): Promise<() => Promise<void>> {
  const { undo } = await compassService.updateGoal(goalId, { reachedAt: reached ? `${today()}T12:00:00.000Z` : null });
  return undo;
}

/** Stops linking the goal; the goal stays in Compass. */
export const unlinkGoal = (trip: Trip) => setLinks(trip.id, { goalId: undefined });

// ---------- Oikonomia ----------

export async function envelopeOf(trip: Trip): Promise<Envelope | undefined> {
  const id = linksOf(trip.id).envelopeId;
  return id ? getEnvelope(id) : undefined;
}

/** Every envelope, to pick one already saving for this trip. */
export async function freeEnvelopes(): Promise<Envelope[]> {
  return (await listEnvelopes()).sort((a, b) => a.name.localeCompare(b.name));
}

const sideOf = (envelope: Envelope): EnvelopeSide => ({ name: envelope.name, target: envelope.targetCents, date: envelope.targetDate, currency: envelope.currency });

/** A new envelope for the trip: its name, the budget as the target, the start as its date, and what was saved here. */
async function createEnvelope(trip: Trip, currency: string): Promise<Envelope> {
  const saved = linksOf(trip.id).saved;
  const code = trip.budget?.currency ?? currency;
  let envelope: Envelope = {
    ...newEnvelope(trip.name, code, new Date().toISOString(), newId()),
    targetCents: trip.budget?.cents ?? 0,
    ...(trip.start && trip.start > today() ? { targetDate: trip.start } : {}),
  };
  // Money saved in Poreia before the envelope existed moves into it, once.
  if (saved?.cents && saved.currency === code) envelope = addEnvelopeEntry(envelope, saved.cents, 'Saved in Poreia', today(), newId());
  await putEnvelope(envelope);
  setLinks(trip.id, { envelopeId: envelope.id, envelopeGone: undefined, saved: saved?.currency === code ? undefined : saved, envelopeSeen: planEnvelopeSync(trip, sideOf(envelope), undefined, today()).seen });
  return envelope;
}

/** Made by hand (after an envelope was deleted or unlinked); gives back the undo. */
export async function makeEnvelope(trip: Trip, currency: string): Promise<() => Promise<void>> {
  const before = linksOf(trip.id);
  const envelope = await createEnvelope(trip, currency);
  return async () => {
    setLinks(trip.id, { envelopeId: before.envelopeId, envelopeGone: before.envelopeGone, saved: before.saved, envelopeSeen: before.envelopeSeen });
    await deleteEnvelope(envelope.id);
  };
}

/** Links an envelope the person already has; unlinking keeps it in Oikonomia and stops one being made by itself. */
export function linkEnvelope(trip: Trip, id: string | undefined): () => void {
  return setLinks(trip.id, id ? { envelopeId: id, envelopeGone: undefined, envelopeSeen: undefined } : { envelopeId: undefined, envelopeGone: true, envelopeSeen: undefined });
}

const running = new Set<string>();

/**
 * Keeps a trip and its envelope in step: makes the envelope the first time (a trip still to come, Oikonomia added),
 * then passes each side's changes to the other (`planEnvelopeSync`). An envelope deleted in Oikonomia is let go.
 */
export async function syncEnvelope(given: Trip, currency: string): Promise<void> {
  // The trip as it is now, not as the screen last drew it.
  const trip = trips.get(given.id) ?? given;
  if (running.has(trip.id)) return;
  running.add(trip.id);
  try {
    const links = linksOf(trip.id);
    if (!links.envelopeId) {
      if (!links.envelopeGone && phaseOf(trip, today()).kind !== 'past') await createEnvelope(trip, currency);
      return;
    }
    const envelope = await getEnvelope(links.envelopeId);
    if (!envelope) {
      setLinks(trip.id, { envelopeId: undefined, envelopeGone: true, envelopeSeen: undefined });
      return;
    }
    const plan = planEnvelopeSync(trip, sideOf(envelope), links.envelopeSeen, today());
    if (plan.envelope) {
      const next = { ...envelope, updatedAt: new Date().toISOString() };
      if ('name' in plan.envelope && plan.envelope.name) next.name = plan.envelope.name;
      if ('target' in plan.envelope) next.targetCents = plan.envelope.target ?? 0;
      if ('date' in plan.envelope) {
        if (plan.envelope.date) next.targetDate = plan.envelope.date;
        else delete next.targetDate;
      }
      await putEnvelope(next);
    }
    if (plan.trip) {
      const current = trips.get(trip.id);
      if (current) trips.put({ ...current, ...(plan.trip.name ? { name: plan.trip.name } : {}), ...('budget' in plan.trip ? { budget: plan.trip.budget } : {}), updatedAt: new Date().toISOString() });
    }
    setLinks(trip.id, { envelopeSeen: plan.seen });
  } finally {
    running.delete(trip.id);
  }
}

/** Told when envelopes change here, in another open app, or by sync. */
export function watchEnvelopes(listener: () => void): () => void {
  const stopStore = subscribeOikonomia(listener);
  const stopRemote = onRemoteChanges(listener);
  const onShow = () => document.visibilityState === 'visible' && listener();
  document.addEventListener('visibilitychange', onShow);
  return () => {
    stopStore();
    stopRemote();
    document.removeEventListener('visibilitychange', onShow);
  };
}

/** Money into the envelope (or out, when negative); gives back the undo. */
export async function addToEnvelope(envelope: Envelope, cents: number, note: string): Promise<() => Promise<void>> {
  const fresh = (await getEnvelope(envelope.id)) ?? envelope;
  await putEnvelope(addEnvelopeEntry(fresh, cents, note, today(), newId()));
  return () => putEnvelope(fresh);
}
