import { daysText, supplyLeft, timeText, type Change, type Medicine } from './medicines';

/*
 * The medicine's history writes itself: each save is compared with the one before, and what changed is kept with the
 * date. Nothing is asked of the person. A shared medicine keeps a short record (it is sealed into one item), so its
 * marks are trimmed and the supply recounted first, so the count of doses left stays the same.
 */

const schedule = (medicine: Medicine) =>
  [medicine.times.map(timeText).join(', '), medicine.times.length ? daysText(medicine.days) : '', medicine.asNeeded ? 'as needed' : '']
    .filter(Boolean)
    .join(' · ');

const KEEP_CHANGES = 40;

/** What a save changed, compared with the medicine before it (undefined: a new medicine). */
export function changesOf(before: Medicine | undefined, after: Medicine, today: string): Change[] {
  if (!before) return [{ on: after.start <= today ? after.start : today, what: 'started', to: [after.dose, schedule(after)].filter(Boolean).join(' · ') || undefined }];
  const out: Change[] = [];
  if ((before.dose ?? '') !== (after.dose ?? '')) out.push({ on: today, what: 'dose', from: before.dose || undefined, to: after.dose || undefined });
  if (schedule(before) !== schedule(after)) out.push({ on: today, what: 'schedule', from: schedule(before) || undefined, to: schedule(after) || undefined });
  if ((before.end ?? '') !== (after.end ?? '')) out.push({ on: today, what: 'course', from: before.end, to: after.end });
  if (!before.stopped && after.stopped) out.push({ on: after.stopped, what: 'stopped' });
  if (before.stopped && !after.stopped) out.push({ on: today, what: 'restarted' });
  const left = (medicine: Medicine) => supplyLeft(medicine) ?? 0;
  if (before.supply && after.supply && after.supply.countedAt !== before.supply.countedAt && left(after) > left(before)) {
    out.push({ on: today, what: 'refilled', to: `+${left(after) - left(before)}` });
  }
  return out;
}

/** The medicine as saved: its changes added. */
export function withChanges(before: Medicine | undefined, after: Medicine, today: string): Medicine {
  const added = changesOf(before, after, today);
  if (!added.length) return after.changes === before?.changes ? after : { ...after, changes: before?.changes };
  return { ...after, changes: [...(before?.changes ?? after.changes ?? []), ...added].slice(-KEEP_CHANGES) };
}

/** One change in words: "Dose 10 mg → 20 mg". */
export function changeText(change: Change): string {
  const arrow = change.from && change.to ? `${change.from} → ${change.to}` : (change.to ?? change.from ?? '');
  switch (change.what) {
    case 'started':
      return change.to ? `Started · ${change.to}` : 'Started';
    case 'dose':
      return `Dose ${arrow}`.trim();
    case 'schedule':
      return `Times ${arrow}`.trim();
    case 'course':
      return change.to ? `Course to ${change.to}` : 'Course end taken off';
    case 'stopped':
      return 'Stopped';
    case 'restarted':
      return 'Started again';
    case 'refilled':
      return `Refilled ${change.to ?? ''}`.trim();
  }
}

/** For a shared medicine: recent marks only (and changes), the supply recounted so what is left stays the same. */
export function forSharing(medicine: Medicine, now: Date, days = 10, marks = 30, changes = 12): Medicine {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const taken = medicine.taken.filter((each) => each.at >= since).slice(-marks);
  let supply = medicine.supply;
  if (supply && taken.length < medicine.taken.length) {
    // Counted again from the oldest mark kept: the marks kept from then on still come off, as before.
    const from = taken.length ? taken.reduce((oldest, each) => (each.at < oldest ? each.at : oldest), taken[0].at) : now.toISOString();
    if (supply.countedAt < from) {
      const keptUse = taken.filter((each) => !each.skipped && each.at >= from).length * supply.perDose;
      supply = { ...supply, count: (supplyLeft(medicine) ?? supply.count) + keptUse, countedAt: from };
    }
  }
  return { ...medicine, taken, supply, changes: medicine.changes?.slice(-changes) };
}
