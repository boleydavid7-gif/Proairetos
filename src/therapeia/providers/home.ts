import { watchLocal } from '../../app/family/localChanges';
import { homeDayText, sinceText, type HomeRow, type Provider } from '../../core/providers';
import { personalDate } from '../../core/rhythm/personalDay';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { mainSleeps } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { allMedicines, circles, putMedicine, restoreMedicine } from '../app/state';
import { anchorsFrom, dosesOn, isCurrent, refillDay, take, withWho, type Appointment } from '../core/medicines';

const clock = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const open = (what: string) => `/therapeia/?open=${encodeURIComponent(what)}`;

/*
 * Doses not yet marked, refills coming up and visits today: the medicine or contact, the time and the place. The amount
 * of a dose never leaves Therapeia through Home, nor do notes, questions, readings or the health card (manifest,
 * therapeia.home). A pull marks a dose taken in Therapeia, with an undo.
 */
export const therapeiaHome: Provider<'home'> = {
  app: 'therapeia',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:therapeia:medicine:', 'local:therapeia:visit:', 'shared:therapeia', 'setting:diaita:settings', 'schedulePatterns', 'scheduleExceptions'],
  async read(ctx) {
    const medicines = allMedicines();
    const calendarToday = toLocalDate(ctx.now);
    // Waking and sleep around the person's schedule, and the person's day, as Therapeia works them out.
    const from = addDays(calendarToday, -1);
    const until = addDays(calendarToday, 1);
    const blocks = ctx.schedule ? await ctx.schedule(atTime(addDays(from, -3), '00:00'), atTime(addDays(until, 3), '00:00')) : [];
    const rhythm = diaitaSettings.load();
    const anchors = anchorsFrom(mainSleeps(addDays(from, -2), addDays(until, 1), blocks.map((block) => ({ start: block.start, end: block.end, kind: block.kind, label: block.label || block.patternName })), rhythm));
    const doseDay = personalDate(ctx.now, blocks, ctx.daySettings?.() ?? { startHour: 0, followShifts: true });
    const visits = (await ctx.records<Appointment>('local:therapeia:visit:')).filter((visit) => typeof visit.id === 'string' && visit.at.slice(0, 10) === calendarToday);

    const rows: HomeRow[] = [];
    for (const dose of dosesOn(medicines.filter((medicine) => isCurrent(medicine, doseDay)), doseDay, anchors).filter((each) => !each.taken).sort((a, b) => a.at.getTime() - b.at.getTime())) {
      rows.push({
        ref: { app: 'therapeia', kind: 'dose', id: `${dose.medicine.id}|${dose.slot}` },
        group: 'attention',
        title: withWho(dose.medicine, dose.medicine.name),
        detail: clock(dose.at),
        open: open(`medicine:${dose.medicine.id}`),
        swipe: { id: `dose:${dose.medicine.id}:${dose.slot}`, word: 'Taken', marks: true },
      });
    }
    for (const medicine of medicines) {
      const day = refillDay(medicine, ctx.today);
      if (!day || day > addDays(ctx.today, 7)) continue;
      rows.push({
        ref: { app: 'therapeia', kind: 'refill', id: medicine.id },
        group: 'attention',
        title: withWho(medicine, medicine.name),
        detail: `Refill due ${sinceText(homeDayText(day, ctx.today)) || 'today'}`,
        open: open(`medicine:${medicine.id}`),
        swipe: { id: `refill:${medicine.id}`, word: 'Done' },
      });
    }
    for (const visit of visits) {
      rows.push({
        ref: { app: 'therapeia', kind: 'visit', id: visit.id },
        group: 'attention',
        title: withWho(visit, visit.with),
        detail: [clock(new Date(visit.at)), visit.where].filter(Boolean).join(' · '),
        open: open(`visit:${visit.id}`),
        swipe: { id: `visit:${visit.id}`, word: 'Done' },
      });
    }
    return rows;
  },
  act(ref) {
    if (ref.kind !== 'dose') return () => undefined;
    const split = ref.id.lastIndexOf('|');
    const before = allMedicines().find((medicine) => medicine.id === ref.id.slice(0, split));
    if (!before) return () => undefined;
    putMedicine(take(before, ref.id.slice(split + 1), new Date()));
    return () => restoreMedicine(before);
  },
  subscribe(listener) {
    const offs = [circles.subscribeShared(listener), watchLocal('therapeia:medicine:', listener), watchLocal('therapeia:visit:', listener), watchLocal('diaita:settings', listener)];
    return () => offs.forEach((off) => off());
  },
  // Doses and visits are by the clock.
  maxAgeMs: 60_000,
};
