import type { LifeItem } from '../../core/life-items/types';
import { nowReasonsFor } from '../../core/now/rules';
import type { NowItem, NowViewModel } from './types';

function toNowItem(item: LifeItem): NowItem {
  return {
    id: item.id,
    title: item.title,
    reasons: nowReasonsFor(item),
    scheduledAt: item.scheduledAt,
    checkBackAt: item.checkBackAt,
  };
}

function byTime(a?: string, b?: string): number {
  return (a ?? '').localeCompare(b ?? '');
}

/**
 * Groups what the person chose to see. Lists are ordered by time or by
 * when they were captured, never by inferred importance.
 */
export function buildNowViewModel(items: LifeItem[], now: Date): NowViewModel {
  const visible = items
    .filter((item) => nowReasonsFor(item).length > 0)
    .sort((a, b) => byTime(a.createdAt, b.createdAt))
    .map(toNowItem);

  const scheduled = visible
    .filter((item) => item.reasons.includes('SCHEDULED'))
    .sort((a, b) => byTime(a.scheduledAt, b.scheduledAt));

  const nowIso = now.toISOString();
  const nextCommitment = scheduled.find((item) => (item.scheduledAt ?? '') >= nowIso) ?? null;

  const important = visible.filter((item) => item.reasons.includes('IMPORTANT'));

  const waiting = visible
    .filter((item) => item.reasons.includes('CHECK_BACK'))
    .sort((a, b) => byTime(a.checkBackAt, b.checkBackAt));

  const unsortedCount = visible.filter((item) => item.reasons.includes('UNSORTED')).length;

  return {
    nextCommitment,
    scheduled,
    important,
    waiting,
    unsortedCount,
    isEmpty: visible.length === 0,
  };
}
