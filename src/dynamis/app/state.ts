import { collection, stored } from '../../app/family/shell';
import { notifications } from '../../app/notify/notifications';
import type { MobilityLog } from '../core/mobility';
import type { SetLog, Setup, Workout } from '../core/plan';

export type DynamisSettings = { started: boolean; reminders: boolean };

export const settings = stored<DynamisSettings>('dynamis:settings', () => ({ started: false, reminders: false }));
/** The plan; `aim` is empty until the person makes one. */
export const plan = stored<Partial<Setup>>('dynamis:setup', () => ({}));
export const workouts = collection<Workout>('dynamis:workout:');
export const mobility = collection<MobilityLog>('dynamis:mobility:');

export const isSetup = (value: Partial<Setup>): value is Setup => Boolean(value.aim && value.place && value.days?.length);

export function savePlan(next: Setup): void {
  plan.save(next);
  notifications.refreshSoon();
}

/** A session in progress on this phone: kept through a reload, never synced or backed up. */
export type DraftSet = SetLog & { done?: boolean };
export type Draft = { session: string; started: string; sets: Record<string, DraftSet[]>; steps: Record<string, number>; lighter?: boolean };
export const draft = stored<{ current?: Draft }>('dynamisDraft', () => ({}));

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
