import { useSheet } from '../../components/ui/useSheet';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { scheduleService } from '../../app/services';
import type { TimeBlock } from '../../core/scheduling/types';
import { formatLocalDay } from '../schedule/format';

export type DayChangeTarget = {
  patternId: string;
  patternName: string;
  date: string;
  /** The hours that day currently has; empty when it is a day off. */
  blocks: TimeBlock[];
};

type Props = {
  target: DayChangeTarget;
  onClose: () => void;
};

/** Changes one day of a schedule: different hours, a day off, or extra hours. */
export default function DayChangeSheet({ target, onClose }: Props) {
  const { dialog, panel } = useSheet();
  const change = useServiceData(scheduleService.subscribe, () => scheduleService.dayChange(target.patternId, target.date));
  const working = target.blocks.length > 0;
  const [editing, setEditing] = useState(false);
  const [block, setBlock] = useState<TimeBlock>(target.blocks[0] ?? { start: '09:00', end: '17:00', label: 'Extra' });


  const close = () => dialog.current?.close();
  const apply = async (blocks: TimeBlock[]) => {
    await scheduleService.changeDay(target.patternId, target.date, blocks);
    close();
  };

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={`Change ${target.patternName} on ${formatLocalDay(target.date)}`}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">{target.patternName}</p>
        <p className="sheet__status">
          {formatLocalDay(target.date, { weekday: 'long', month: 'long', day: 'numeric' })}
          {change ? ' · changed for this day' : ''}
        </p>

        {editing ? (
          <section className="sheet__section" aria-label="Hours for this day">
            <input
              className="field-input"
              aria-label="Name for these hours"
              placeholder="Name (optional)"
              value={block.label ?? ''}
              onChange={(event) => setBlock({ ...block, label: event.target.value || undefined })}
            />
            <div className="block-fields">
              <label className="block-fields__time">
                <span>Starts</span>
                <input type="time" className="field-input" aria-label="Start time" value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} />
              </label>
              <label className="block-fields__time">
                <span>Ends</span>
                <input type="time" className="field-input" aria-label="End time" value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} />
              </label>
            </div>
            <div className="chip-row">
              <button type="button" className="chip chip--accent" disabled={!block.start || !block.end || block.start === block.end} onClick={() => apply([block])}>
                Save for this day
              </button>
              <button type="button" className="button-quiet" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <div className="stack-tight">
            {working ? (
              <>
                <button type="button" className="chip chip--wide" onClick={() => setEditing(true)}>
                  Different hours this day
                </button>
                <button type="button" className="chip chip--wide" onClick={() => apply([])}>
                  Not working this day
                </button>
              </>
            ) : (
              <button type="button" className="chip chip--wide" onClick={() => setEditing(true)}>
                Add hours this day
              </button>
            )}
            {change && (
              <button
                type="button"
                className="chip chip--wide"
                onClick={async () => {
                  await scheduleService.restoreDay(target.patternId, target.date);
                  close();
                }}
              >
                Back to the usual
              </button>
            )}
          </div>
        )}
        <p className="sheet__hint">Only this day changes. The rest of the pattern stays as it is.</p>
      </div>
    </dialog>
  );
}
