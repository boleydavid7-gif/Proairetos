import type { Notice } from './notices';

type PursuitReminder = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastCheckInAt?: string;
  reminderAfterDays?: number;
};

/** A single quiet reminder when an active pursuit has gone without a check-in. */
export function pursuitNotices(pursuits: readonly PursuitReminder[], now: Date, until: Date): Notice[] {
  return pursuits.flatMap((pursuit) => {
    if (pursuit.status !== 'active') return [];
    const days = Number.isFinite(pursuit.reminderAfterDays) ? Math.max(0, Math.round(pursuit.reminderAfterDays!)) : 7;
    if (days <= 0) return [];
    const anchor = new Date(pursuit.lastCheckInAt ?? pursuit.createdAt);
    if (!Number.isFinite(anchor.getTime())) return [];
    const due = new Date(anchor.getTime() + days * 86_400_000);
    const at = due.getTime() <= now.getTime() ? now : due;
    if (at.getTime() > until.getTime()) return [];
    return [{
      key: `pursuit:${pursuit.id}:${anchor.toISOString()}:${days}`,
      kind: 'pursuit',
      at,
      title: `Check in: ${pursuit.title}`,
      body: `No check-in in ${days} days`,
      open: 'compass',
    }];
  });
}
