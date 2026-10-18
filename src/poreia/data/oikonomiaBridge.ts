import { isAdded } from '../../app/family/added';
import { localDate } from '../../oikonomia/core/bills';
import { addEnvelopeEntry, newEnvelope, type Envelope } from '../../oikonomia/core/envelopes';
import { listEnvelopes, putEnvelope } from '../../oikonomia/data/store';
import { newId } from '../core/id';
import { monthlyContribution, type TripSavingsPlan } from '../core/savings';

export type OikonomiaSavingsResult = {
  available: boolean;
  envelope?: Envelope;
};

const vacationName = (envelope: Envelope) => envelope.name.trim().toLocaleLowerCase() === 'vacation';

/**
 * Links a Poreia plan to Oikonomia only when that add-on is available to the person.
 * The shared database means the envelope appears in Oikonomia without a second copy of the balance.
 */
export async function syncPlanToOikonomia(plan: TripSavingsPlan): Promise<OikonomiaSavingsResult> {
  if (!isAdded('oikonomia')) return { available: false };
  const envelopes = await listEnvelopes();
  let envelope = plan.envelopeId ? envelopes.find((item) => item.id === plan.envelopeId) : undefined;
  if (!envelope) envelope = envelopes.find((item) => vacationName(item) && item.currency === plan.currency);
  if (!envelope) envelope = newEnvelope('Vacation', plan.currency, new Date().toISOString(), newId());

  const next: Envelope = {
    ...envelope,
    // Keep existing funds and any larger household target intact while bringing this trip's plan into view.
    targetCents: Math.max(envelope.targetCents, plan.targetCents),
    ...(plan.targetDate ? { targetDate: plan.targetDate } : {}),
    monthlyCents: Math.max(envelope.monthlyCents, monthlyContribution(plan.contributionCents, plan.cadence)),
    updatedAt: new Date().toISOString(),
  };
  await putEnvelope(next);
  return { available: true, envelope: next };
}

/** Add a contribution to the linked Vacation envelope, if the add-on is available. */
export async function addPlanContribution(plan: TripSavingsPlan, amountCents: number, note: string): Promise<OikonomiaSavingsResult> {
  const linked = await syncPlanToOikonomia(plan);
  if (!linked.available || !linked.envelope || amountCents <= 0) return linked;
  const next = addEnvelopeEntry(linked.envelope, amountCents, note, localDate(), newId());
  await putEnvelope(next);
  return { available: true, envelope: next };
}
