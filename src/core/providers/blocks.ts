import type { ScheduleOccurrence } from '../scheduling/types';
import type { NoticeBlock } from './types';

/**
 * What a provider is told about the person's time: every block as its start, end and kind, and the name of a shift only
 * from the person's own schedule (its label, else the schedule's name). A block from another calendar is built from those
 * three fields alone, so its title, calendar name and anything else cannot ride along, whatever the source object holds.
 */
export function toNoticeBlocks(own: readonly ScheduleOccurrence[], others: readonly Pick<ScheduleOccurrence, 'start' | 'end' | 'kind'>[]): NoticeBlock[] {
  return [
    ...own.map((block) => {
      const label = block.label || block.patternName;
      return label ? { start: block.start, end: block.end, kind: block.kind, label } : { start: block.start, end: block.end, kind: block.kind };
    }),
    ...others.map((block) => ({ start: block.start, end: block.end, kind: block.kind })),
  ];
}
