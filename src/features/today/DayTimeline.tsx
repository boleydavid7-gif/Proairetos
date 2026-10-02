import { Fragment, type KeyboardEvent } from 'react';
import { toLocalDate } from '../../core/scheduling/dates';
import { formatTimeOf } from '../schedule/format';
import type { DayChangeTarget } from './DayChangeSheet';
import { blockTitle, type TimelineEntry } from './timeline';

type Props = {
  date: string;
  entries: TimelineEntry[];
  /** Set when showing today, to place the "now" marker. */
  now?: Date;
  onChangeDay: (target: DayChangeTarget) => void;
  onOpenItem: (id: string) => void;
  /** When set, tapping any timed entry calls this instead, e.g. to open the days ahead. */
  onOpenEntry?: (key: string) => void;
  /** Lines beside blocks of time set aside for a goal, by schedule id. */
  goalLines?: ReadonlyMap<string, string>;
};

function shiftDetail(entry: Extract<TimelineEntry, { kind: 'shift' }>, date: string): string {
  const started = toLocalDate(entry.start) < date ? 'from yesterday' : '';
  const ends = toLocalDate(entry.end) > date ? 'ends tomorrow' : '';
  return [started, ends, entry.occurrence.changed ? 'changed for this day' : ''].filter(Boolean).join(' · ');
}

export default function DayTimeline({ date, entries, now, onChangeDay, onOpenItem, onOpenEntry, goalLines }: Props) {
  const timed = entries.filter((entry) => entry.kind !== 'off' && entry.kind !== 'allday');
  const nowIndex = now ? timed.findIndex((entry) => 'start' in entry && entry.start > now) : -1;
  const markerAt = now ? (nowIndex === -1 ? timed.length : nowIndex) : -1;
  const marker = now && (
    <li className="timeline__now" aria-label={`Now, ${formatTimeOf(now)}`}>
      <span>Now · {formatTimeOf(now)}</span>
    </li>
  );

  return (
    <ol className="timeline" aria-label="Your day">
      {entries
        .filter((entry) => entry.kind === 'off')
        .map((entry) =>
          entry.kind === 'off' ? (
            <li key={entry.key}>
              <button
                type="button"
                className="timeline__off"
                onClick={() =>
                  onChangeDay({ patternId: entry.pattern.id, patternName: entry.pattern.name, date, blocks: [] })
                }
              >
                {entry.pattern.name} · day off
              </button>
            </li>
          ) : null,
        )}

      {entries.map((entry) =>
        entry.kind === 'allday' ? (
          <li key={entry.key} className="timeline__allday">
            All day · {entry.event.title} <span className="timeline__source">{entry.event.source}</span>
          </li>
        ) : null,
      )}

      {timed.map((entry, index) => (
        <Fragment key={entry.key}>
          {index === markerAt && marker}
          {entry.kind === 'shift' ? (
            <li>
              <button
                type="button"
                className={`timeline__entry timeline__entry--${entry.occurrence.kind.toLowerCase()}`}
                onClick={() =>
                  onOpenEntry ? onOpenEntry(entry.key) : onChangeDay({
                    patternId: entry.occurrence.patternId,
                    patternName: entry.occurrence.patternName,
                    date: entry.occurrence.date,
                    blocks: [{ start: formatHHMM(entry.start), end: formatHHMM(entry.end), label: entry.occurrence.label }],
                  })
                }
              >
                <span className="timeline__time">
                  {formatTimeOf(entry.start)}
                  <span className="timeline__until">{formatTimeOf(entry.end)}</span>
                </span>
                <span className="timeline__body">
                  <span className="timeline__title">{blockTitle(entry.occurrence)}</span>
                  {shiftDetail(entry, date) && <span className="timeline__detail">{shiftDetail(entry, date)}</span>}
                  {goalLines?.get(entry.occurrence.patternId) && (
                    <span className="timeline__detail timeline__detail--goal">{goalLines.get(entry.occurrence.patternId)}</span>
                  )}
                </span>
              </button>
            </li>
          ) : entry.kind === 'event' ? (
            <li>
              <div
                className="timeline__entry timeline__entry--event"
                {...(onOpenEntry ? { role: 'button', tabIndex: 0, onClick: () => onOpenEntry(entry.key), onKeyDown: (e: KeyboardEvent) => e.key === 'Enter' && onOpenEntry(entry.key) } : {})}
              >
                <span className="timeline__time">
                  {formatTimeOf(entry.start)}
                  <span className="timeline__until">{formatTimeOf(entry.end)}</span>
                </span>
                <span className="timeline__body">
                  <span className="timeline__title">{entry.event.title}</span>
                  <span className="timeline__detail">
                    {[entry.event.source, entry.event.location].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
            </li>
          ) : entry.kind === 'item' ? (
            <li>
              <button type="button" className="timeline__entry timeline__entry--item" onClick={() => (onOpenEntry ? onOpenEntry(entry.item.id) : onOpenItem(entry.item.id))}>
                <span className="timeline__time">{formatTimeOf(entry.start)}</span>
                <span className="timeline__body">
                  <span className="timeline__title">{entry.item.title}</span>
                </span>
              </button>
            </li>
          ) : null}
        </Fragment>
      ))}
      {markerAt === timed.length && marker}
    </ol>
  );
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
