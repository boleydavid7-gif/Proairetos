import { useMemo } from 'react';
import { collection, stored } from '../../app/family/shell';
import { useDays } from '../../app/family/personalDays';
import { notifications } from '../../app/notify/notifications';
import { addDays } from '../../core/scheduling/dates';
import { mainSleeps } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { anchorsFrom, type Anchors, type Appointment, type HealthCard, type Medicine } from '../core/medicines';
import { defaultCareNotices, type CareNoticeChoices } from '../core/notices';

export type TherapeiaSettings = { started: boolean; notices: CareNoticeChoices; card: HealthCard };

export const settings = stored<TherapeiaSettings>('therapeia:settings', () => ({ started: false, notices: { ...defaultCareNotices }, card: {} }));
export const medicines = collection<Medicine>('therapeia:medicine:');
export const appointments = collection<Appointment>('therapeia:visit:');

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function putMedicine(medicine: Medicine): void {
  medicines.put(medicine);
  notifications.refreshSoon();
}

export function removeMedicine(id: string): void {
  medicines.remove(id);
  notifications.refreshSoon();
}

export function putAppointment(appointment: Appointment): void {
  appointments.put(appointment);
  notifications.refreshSoon();
}

export function removeAppointment(id: string): void {
  appointments.remove(id);
  notifications.refreshSoon();
}

/** Waking and sleep around the person's schedule (Diaita's plan, with Diaita's settings or its usual ones), and their day. */
export function useAnchors(from: string, until: string): { anchors: Anchors; dayAt: (when: Date) => string } {
  const rhythm = diaitaSettings.use();
  const { blocks: occurrences, dayAt } = useDays(addDays(from, -2), addDays(until, 1));
  const anchors = useMemo(() => {
    const blocks = occurrences.map((block) => ({ start: block.start, end: block.end, kind: block.kind, label: block.label || block.patternName }));
    return anchorsFrom(mainSleeps(addDays(from, -2), addDays(until, 1), blocks, rhythm));
  }, [occurrences, rhythm, from, until]);
  return { anchors, dayAt };
}
