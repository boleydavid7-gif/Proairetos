import { compassService } from '../../app/services';
import type { CompassStatement } from '../../core/compass/types';
import { addEnvelopeEntry, newEnvelope, type Envelope } from '../../oikonomia/core/envelopes';
import { deleteEnvelope, getEnvelope, listEnvelopes, putEnvelope } from '../../oikonomia/data/store';
import type { Trip } from '../core/model';
import { linksOf, newId, setLinks, today } from './state';

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

/** A new envelope for the trip: its name, the budget as the target, the trip's start as the date. */
export async function makeEnvelope(trip: Trip, currency: string): Promise<() => Promise<void>> {
  const envelope: Envelope = {
    ...newEnvelope(trip.name, trip.budget?.currency ?? currency, new Date().toISOString(), newId()),
    targetCents: trip.budget?.cents ?? 0,
    ...(trip.start && trip.start > today() ? { targetDate: trip.start } : {}),
  };
  await putEnvelope(envelope);
  const undoLink = setLinks(trip.id, { envelopeId: envelope.id });
  return async () => {
    undoLink();
    await deleteEnvelope(envelope.id);
  };
}

export const linkEnvelope = (trip: Trip, id: string | undefined) => setLinks(trip.id, { envelopeId: id });

/** Money into the envelope (or out, when negative); gives back the undo. */
export async function addToEnvelope(envelope: Envelope, cents: number, note: string): Promise<() => Promise<void>> {
  await putEnvelope(addEnvelopeEntry(envelope, cents, note, today(), newId()));
  return () => putEnvelope(envelope);
}
