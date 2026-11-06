import type { Notice } from '../../core/notify/notices';
import { atTime, toLocalDate } from '../../core/scheduling/dates';
import { daysLeft, dosesBetween, refillDay, whoOf, withWho, type Anchors, type Appointment, type Medicine } from './medicines';

export type CareNoticeChoices = {
  doses: boolean;
  /** Medicine names on the notice; off, it says only that one is due. */
  names: boolean;
  refills: boolean;
  appointments: boolean;
  /** Minutes before an appointment. */
  appointmentLead: number;
};

export const defaultCareNotices: CareNoticeChoices = { doses: true, names: false, refills: true, appointments: true, appointmentLead: 120 };

const MORNING = '09:00';

/** Therapeia's notices from now until `until`: doses not yet marked (several at one time as one), refills, appointments. */
export function careNotices(medicines: readonly Medicine[], appointments: readonly Appointment[], choices: CareNoticeChoices, now: Date, until: Date, anchors?: Anchors): Notice[] {
  const notices: Notice[] = [];
  const today = toLocalDate(now);
  const last = toLocalDate(until);

  if (choices.doses) {
    // `named` is what the key is made of and is never shown (it keeps the dose, so a notification's tag and a server row's id stay
    // what they were); `shown` is what the words may say, the name alone and never an amount.
    const byTime = new Map<number, { named: string; shown: string }[]>();
    const whoAt = new Map<number, string[]>();
    for (const dose of dosesBetween(medicines, today, last, anchors)) {
      if (dose.taken || dose.at < now || dose.at > until) continue;
      const named = withWho(dose.medicine, dose.medicine.dose ? `${dose.medicine.name}, ${dose.medicine.dose}` : dose.medicine.name);
      byTime.set(dose.at.getTime(), [...(byTime.get(dose.at.getTime()) ?? []), { named, shown: withWho(dose.medicine, dose.medicine.name) }]);
      whoAt.set(dose.at.getTime(), [...(whoAt.get(dose.at.getTime()) ?? []), whoOf(dose.medicine)]);
    }
    for (const [time, names] of byTime) {
      const ordered = [...names].sort((a, b) => a.named.localeCompare(b.named));
      const sorted = ordered.map((each) => each.named);
      const shown = ordered.map((each) => each.shown);
      // Without names, only whose: "A medicine for Mia".
      const whos = new Set(whoAt.get(time));
      const only = whos.size === 1 ? [...whos][0] : '';
      const unnamed = sorted.length === 1 ? 'A medicine' : `${sorted.length} medicines`;
      notices.push({
        key: `therapeia:dose:${time}:${sorted.join('|').slice(0, 60)}`,
        kind: 'dose',
        at: new Date(time),
        title: choices.names && sorted.length === 1 ? shown[0] : only ? `${unnamed} for ${only}` : unnamed,
        body: choices.names && sorted.length > 1 ? shown.join(' · ') : 'Now.',
        open: 'therapeia:today',
      });
    }
  }

  if (choices.refills) {
    for (const medicine of medicines) {
      const day = refillDay(medicine, today);
      if (!day) continue;
      const at = atTime(day, MORNING);
      if (at < now || at > until) continue;
      const left = daysLeft(medicine);
      notices.push({
        key: `therapeia:refill:${medicine.id}:${day}`,
        kind: 'care',
        at,
        title: choices.names ? `Refill: ${withWho(medicine, medicine.name)}` : whoOf(medicine) ? `A refill for ${whoOf(medicine)}` : 'A refill',
        body: left === undefined ? 'Soon.' : left <= 1 ? 'About a day left.' : `About ${left} days left.`,
        open: `therapeia:medicine:${medicine.id}`,
      });
    }
  }

  if (choices.appointments) {
    for (const appointment of appointments) {
      const starts = new Date(appointment.at);
      const at = new Date(starts.getTime() - choices.appointmentLead * 60_000);
      if (at < now || at > until) continue;
      notices.push({
        key: `therapeia:visit:${appointment.id}:${appointment.at}`,
        kind: 'care',
        at,
        // Without names, only whose, as for a dose or a refill: who the visit is with and where stay in the app.
        title: choices.names ? withWho(appointment, appointment.with) : whoOf(appointment) ? `A visit for ${whoOf(appointment)}` : 'A visit',
        body: [starts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), choices.names ? appointment.where : undefined].filter(Boolean).join(' · '),
        open: `therapeia:visit:${appointment.id}`,
      });
    }
  }
  return notices;
}
