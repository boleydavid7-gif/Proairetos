import { localDate } from './bills';

export type EnvelopeEntry = {
  id: string;
  date: string;
  /** Positive adds money; negative records money used from the envelope. */
  amountCents: number;
  note?: string;
};

export type Envelope = {
  id: string;
  name: string;
  currency: string;
  /** Zero means the person is saving without a fixed target. */
  targetCents: number;
  balanceCents: number;
  /** Optional date for the target. */
  targetDate?: string;
  /** Amount to set aside in each monthly budget. */
  monthlyCents: number;
  entries: EnvelopeEntry[];
  createdAt: string;
  updatedAt: string;
};

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export function newEnvelope(name: string, currency: string, now = new Date().toISOString(), id = ''): Envelope {
  return {
    id,
    name: name.trim(),
    currency,
    targetCents: 0,
    balanceCents: 0,
    monthlyCents: 0,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Older backups and future app integrations can add fields without making an envelope unreadable. */
export function normalizeEnvelope(value: unknown): Envelope | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<Envelope>;
  if (typeof input.id !== 'string' || !input.id || typeof input.name !== 'string' || !input.name.trim()) return undefined;
  const safeAmount = (amount: unknown) => typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  const entries = Array.isArray(input.entries)
    ? (input.entries as unknown[])
        .filter((entry): entry is Partial<EnvelopeEntry> => Boolean(entry && typeof entry === 'object'))
        .filter((entry) => typeof entry.id === 'string' && typeof entry.date === 'string' && datePattern.test(entry.date) && typeof entry.amountCents === 'number' && Number.isSafeInteger(entry.amountCents))
        .map((entry) => ({
          id: entry.id!,
          date: entry.date!,
          amountCents: entry.amountCents!,
          ...(typeof entry.note === 'string' && entry.note.trim() ? { note: entry.note.trim() } : {}),
        }))
    : [];
  const currency = typeof input.currency === 'string' && /^[A-Z]{3}$/.test(input.currency) ? input.currency : 'USD';
  const targetDate = typeof input.targetDate === 'string' && datePattern.test(input.targetDate) ? input.targetDate : undefined;
  return {
    id: input.id,
    name: input.name.trim(),
    currency,
    targetCents: safeAmount(input.targetCents),
    balanceCents: safeAmount(input.balanceCents),
    ...(targetDate ? { targetDate } : {}),
    monthlyCents: safeAmount(input.monthlyCents),
    entries,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : '',
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : '',
  };
}

export function envelopeProgress(envelope: Envelope): number {
  return envelope.targetCents > 0 ? Math.min(100, Math.max(0, (envelope.balanceCents / envelope.targetCents) * 100)) : 0;
}

export function envelopeRemaining(envelope: Envelope): number | undefined {
  return envelope.targetCents > 0 ? Math.max(0, envelope.targetCents - envelope.balanceCents) : undefined;
}

export function envelopeMonthlyTotal(envelopes: readonly Envelope[], currency: string): number {
  return envelopes.filter((envelope) => envelope.currency === currency).reduce((sum, envelope) => sum + envelope.monthlyCents, 0);
}

export function addEnvelopeEntry(envelope: Envelope, amountCents: number, note = '', date = localDate(), id = ''): Envelope {
  const amount = Math.trunc(amountCents);
  if (!Number.isSafeInteger(amount) || amount === 0) return envelope;
  const nextBalance = Math.max(0, envelope.balanceCents + amount);
  const entry: EnvelopeEntry = { id, date, amountCents: nextBalance - envelope.balanceCents, ...(note.trim() ? { note: note.trim() } : {}) };
  return { ...envelope, balanceCents: nextBalance, entries: [...envelope.entries, entry], updatedAt: new Date().toISOString() };
}
