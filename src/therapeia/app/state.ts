import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { collection, stored } from '../../app/family/shell';
import { createSharedLists, joinProof, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { toLocalDate } from '../../core/scheduling/dates';
import { forSharing, withChanges } from '../core/history';
import { useDays } from '../../app/family/personalDays';
import { notifications } from '../../app/notify/notifications';
import { addDays } from '../../core/scheduling/dates';
import { mainSleeps } from '../../diaita/core/rhythm';
import { settings as diaitaSettings } from '../../diaita/app/state';
import { anchorsFrom, type Anchors, type Appointment, type HealthCard, type Medicine } from '../core/medicines';
import type { Reading } from '../core/readings';
import { defaultCareNotices, type CareNoticeChoices } from '../core/notices';

export type TherapeiaSettings = { started: boolean; notices: CareNoticeChoices; card: HealthCard };

export const settings = stored<TherapeiaSettings>('therapeia:settings', () => ({ started: false, notices: { ...defaultCareNotices }, card: {} }));
export const medicines = collection<Medicine>('therapeia:medicine:');
export const appointments = collection<Appointment>('therapeia:visit:');
export const readings = collection<Reading>('therapeia:reading:');

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

/**
 * A care circle: the medicines sealed with the circle's key and shared with whoever helps (a partner, a parent, a
 * carer), who can see them and mark doses. While there is one, it holds the medicines; this device's own list waits.
 */
export const circles = createSharedLists<Medicine>({
  listsKey: 'therapeia:circles',
  cachePrefix: 'therapeiaShared',
  label: 'therapeia-list',
  order: (a, b) => a.name.localeCompare(b.name),
  defaultName: 'Care',
});
export { joinProof, sharingAvailable };

export function circle(): SharedListRef | undefined {
  return circles.sharedLists()[0];
}

let circleCache: { version: number; value: SharedListRef | undefined; items: Medicine[] } | undefined;
function snapshot() {
  const version = circles.sharedVersion();
  if (!circleCache || circleCache.version !== version) {
    const value = circle();
    circleCache = { version, value, items: value ? circles.sharedItems(value) : [] };
  }
  return circleCache;
}

export function useCircle(): SharedListRef | undefined {
  return useSyncExternalStore(circles.subscribeShared, () => snapshot().value);
}

/** Every medicine to show: the circle's while there is one, else this device's own. */
export function useMedicines(): Medicine[] {
  const own = medicines.use();
  const shared = useSyncExternalStore(circles.subscribeShared, () => snapshot());
  useEffect(() => {
    const list = shared.value;
    if (!list) return;
    const pull = () => document.visibilityState === 'visible' && void circles.refreshList(list).catch(() => undefined);
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [shared.value?.id]);
  return shared.value ? shared.items : own;
}

export function allMedicines(): Medicine[] {
  const list = circle();
  return list ? circles.sharedItems(list) : medicines.list();
}

/** Saves a medicine, its history written from what changed; a shared one is kept short enough to seal as one item. */
export function putMedicine(medicine: Medicine): void {
  const list = circle();
  const before = (list ? circles.sharedItems(list) : medicines.list()).find((each) => each.id === medicine.id);
  const saved = withChanges(before, medicine, toLocalDate(new Date()));
  if (list) circles.changeItem(list, saved.id, forSharing(saved, new Date()));
  else medicines.put(saved);
  notifications.refreshSoon();
}

/** Puts a medicine back exactly as it was (undo): no change is written for it. */
export function restoreMedicine(medicine: Medicine): void {
  const list = circle();
  if (list) circles.changeItem(list, medicine.id, forSharing(medicine, new Date()));
  else medicines.put(medicine);
  notifications.refreshSoon();
}

export function removeMedicine(id: string): void {
  const list = circle();
  if (list) circles.changeItem(list, id, null);
  else medicines.remove(id);
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
