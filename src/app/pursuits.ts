import { collection } from './family/shell';

export type PursuitKind = 'build' | 'change' | 'reach' | 'care' | 'learn';
/** Kept for older saved records. Pursuits no longer expose a stage workflow. */
export type PursuitStage = 'clarify' | 'understand' | 'shape' | 'practice' | 'review';
export type PursuitStatus = 'active' | 'paused' | 'complete' | 'archived';
export type PursuitFeeling = 'rough' | 'mixed' | 'steady' | 'good' | 'light';

export const PURSUIT_KINDS: { id: PursuitKind; label: string; detail: string }[] = [
  { id: 'build', label: 'Build something', detail: 'A project with a finished result' },
  { id: 'change', label: 'Change a pattern', detail: 'A habit or behavior you want to reshape' },
  { id: 'reach', label: 'Reach a condition', detail: 'A measurable or felt outcome' },
  { id: 'care', label: 'Care for something', detail: 'A home, relationship, or responsibility' },
  { id: 'learn', label: 'Learn or understand', detail: 'A subject, skill, or question' },
];

export const PURSUIT_FEELINGS: { id: PursuitFeeling; label: string }[] = [
  { id: 'rough', label: 'Rough' },
  { id: 'mixed', label: 'Mixed' },
  { id: 'steady', label: 'Steady' },
  { id: 'good', label: 'Good' },
  { id: 'light', label: 'Light' },
];

export const PURSUIT_REMINDER_CHOICES = [
  { days: 0, label: 'No reminder' },
  { days: 3, label: 'After 3 days' },
  { days: 7, label: 'After 1 week' },
  { days: 14, label: 'After 2 weeks' },
  { days: 30, label: 'After 1 month' },
] as const;

export const DEFAULT_PURSUIT_REMINDER_DAYS = 7;

export type Pursuit = {
  id: string;
  title: string;
  kind: PursuitKind;
  status: PursuitStatus;
  /** Legacy data is retained, but this is no longer shown as a workflow. */
  stage?: PursuitStage;
  area?: string;
  outcome?: string;
  why?: string;
  current?: string;
  friction?: string;
  approach?: string;
  nextMove?: string;
  nextMoveDue?: string;
  reviewAt?: string;
  reviewNote?: string;
  reminderAfterDays?: number;
  lastCheckInAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PursuitCheckIn = {
  id: string;
  pursuitId: string;
  date: string;
  accomplishment?: string;
  feeling?: PursuitFeeling;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export const pursuits = collection<Pursuit>('proairetos:pursuit:');
export const pursuitCheckIns = collection<PursuitCheckIn>('proairetos:pursuit-checkin:');

export const newPursuitId = () => `pursuit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const newPursuitCheckInId = () => `pursuit-checkin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function reminderDaysFor(pursuit: Pick<Pursuit, 'reminderAfterDays'>): number {
  const value = pursuit.reminderAfterDays ?? DEFAULT_PURSUIT_REMINDER_DAYS;
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : DEFAULT_PURSUIT_REMINDER_DAYS;
}

export function inactivityDueAt(pursuit: Pick<Pursuit, 'status' | 'createdAt' | 'lastCheckInAt' | 'reminderAfterDays'>): Date | undefined {
  if (pursuit.status !== 'active') return undefined;
  const days = reminderDaysFor(pursuit);
  if (days <= 0) return undefined;
  const anchor = new Date(pursuit.lastCheckInAt ?? pursuit.createdAt);
  if (!Number.isFinite(anchor.getTime())) return undefined;
  return new Date(anchor.getTime() + days * 86_400_000);
}

export function needsPursuitCheckIn(pursuit: Pick<Pursuit, 'status' | 'createdAt' | 'lastCheckInAt' | 'reminderAfterDays'>, now = new Date()): boolean {
  const due = inactivityDueAt(pursuit);
  return Boolean(due && due.getTime() <= now.getTime());
}
