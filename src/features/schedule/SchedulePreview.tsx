import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { occurrencesStartingOn } from '../../core/scheduling/patterns';
import type { SchedulePattern } from '../../core/scheduling/types';
import { formatLocalDay, formatTimeOf } from './format';

type Props = {
  pattern: SchedulePattern;
  days?: number;
};

/** The next stretch of days exactly as the pattern produces them, to check against a real calendar. */
export default function SchedulePreview({ pattern, days = 14 }: Props) {
  const today = toLocalDate(new Date());
  const start = pattern.anchorDate > today ? pattern.anchorDate : today;
  const dates = Array.from({ length: days }, (_, index) => addDays(start, index));

  return (
    <ol className="preview" aria-label="Upcoming days">
      {dates.map((date) => {
        const occurrences = occurrencesStartingOn(pattern, date);
        return (
          <li key={date} className={occurrences.length === 0 ? 'preview__day preview__day--off' : 'preview__day'}>
            <span className="preview__date">{formatLocalDay(date)}</span>
            <span className="preview__hours">
              {occurrences.length === 0
                ? 'Off'
                : occurrences
                    .map((o) => `${o.label ? `${o.label} · ` : ''}${formatTimeOf(o.start)} – ${formatTimeOf(o.end)}`)
                    .join(', ')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
