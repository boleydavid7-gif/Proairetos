import { useMemo } from 'react';
import { collection, stored } from '../../app/family/shell';
import { useDays } from '../../app/family/personalDays';
import { addDays } from '../../core/scheduling/dates';
import { defaultRhythm, planBetween, type Entry, type RhythmSettings, type WorkBlock, type SleepRecord } from '../core/rhythm';
import type { RhythmNoticeChoices } from '../core/notices';
import { defaultRhythmNotices } from '../core/notices';

export type DiaitaSettings = RhythmSettings & { started: boolean; notices: RhythmNoticeChoices };

export const settings = stored<DiaitaSettings>('diaita:settings', () => ({ ...defaultRhythm, started: false, notices: { ...defaultRhythmNotices } }));

/** One record per night, keyed by the day woken into. */
export const sleeps = collection<SleepRecord & { id: string }>('diaita:sleep:');

/** The plan for a run of days, from the Proairetos schedule, grouped by the person's own day. */
export function usePlan(from: string, until: string): { entries: Entry[]; blocks: WorkBlock[]; dayAt: (when: Date) => string } {
  const current = settings.use();
  const { blocks: occurrences, dayAt } = useDays(addDays(from, -1), until);
  const blocks = useMemo(() => occurrences.map((block) => ({ start: block.start, end: block.end, kind: block.kind, label: block.label || block.patternName })), [occurrences]);
  const entries = useMemo(() => planBetween(addDays(from, -1), addDays(until, 1), blocks, current), [blocks, current, from, until]);
  return { entries, blocks, dayAt };
}
