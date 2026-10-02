import ColorChoice from '../../components/ui/ColorChoice';
import { useState } from 'react';
import { scheduleService } from '../../app/services';
import { mondayOnOrBefore, minutesOf } from '../../core/scheduling/dates';
import { cycleLength } from '../../core/scheduling/patterns';
import type { SchedulePattern, ScheduleSegment, TimeBlock } from '../../core/scheduling/types';
import { ScheduleValidationError, type PatternInput } from '../../services/schedule/scheduleService';
import SchedulePreview from './SchedulePreview';
import { weekdayNames } from './format';

type Props = {
  patternId?: string;
  initial: PatternInput;
  onDone: () => void;
};

const defaultBlock: TimeBlock = { start: '09:00', end: '17:00' };

function crossesMidnight(block: TimeBlock): boolean {
  return Boolean(block.start && block.end) && minutesOf(block.end) <= minutesOf(block.start);
}

function BlockFields({ block, onChange, label }: { block: TimeBlock; onChange: (block: TimeBlock) => void; label: string }) {
  return (
    <div className="block-fields">
      <label className="block-fields__time">
        <span>Starts</span>
        <input
          type="time"
          className="field-input"
          aria-label={`${label} start time`}
          value={block.start}
          onChange={(event) => onChange({ ...block, start: event.target.value })}
        />
      </label>
      <label className="block-fields__time">
        <span>Ends</span>
        <input
          type="time"
          className="field-input"
          aria-label={`${label} end time`}
          value={block.end}
          onChange={(event) => onChange({ ...block, end: event.target.value })}
        />
      </label>
      {crossesMidnight(block) && <p className="block-fields__note">Ends the next morning.</p>}
    </div>
  );
}

function RunCard({
  segment,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  segment: ScheduleSegment;
  index: number;
  count: number;
  onChange: (segment: ScheduleSegment) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const working = segment.blocks.length > 0;
  const block = segment.blocks[0] ?? defaultBlock;
  const name = `Run ${index + 1}`;

  return (
    <li className="run-card">
      <div className="run-card__header">
        <span className="run-card__title">{name}</span>
        <span className="run-card__tools">
          <button type="button" className="icon-button" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className="icon-button" aria-label={`Move ${name} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" className="icon-button" aria-label={`Remove ${name}`} disabled={count === 1} onClick={onRemove}>
            ×
          </button>
        </span>
      </div>

      <div className="run-card__row">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={366}
          className="field-input run-card__days"
          aria-label={`${name} number of days`}
          value={segment.days || ''}
          onChange={(event) => onChange({ ...segment, days: Number(event.target.value) })}
        />
        <span className="run-card__unit">{segment.days === 1 ? 'day' : 'days'}</span>
        <div className="mini-segmented" role="group" aria-label={`${name} working or off`}>
          <button
            type="button"
            aria-pressed={working}
            onClick={() => onChange({ ...segment, blocks: [segment.blocks[0] ?? defaultBlock] })}
          >
            Working
          </button>
          <button type="button" aria-pressed={!working} onClick={() => onChange({ ...segment, blocks: [] })}>
            Off
          </button>
        </div>
      </div>

      {working && (
        <>
          <input
            className="field-input"
            aria-label={`${name} name`}
            placeholder="Name (optional), e.g. Days or Nights"
            value={block.label ?? ''}
            onChange={(event) => onChange({ ...segment, blocks: [{ ...block, label: event.target.value }] })}
          />
          <BlockFields block={block} label={name} onChange={(next) => onChange({ ...segment, blocks: [next] })} />
        </>
      )}
    </li>
  );
}

function CycleEditor({ segments, onChange }: { segments: ScheduleSegment[]; onChange: (segments: ScheduleSegment[]) => void }) {
  const update = (index: number, segment: ScheduleSegment) =>
    onChange(segments.map((current, i) => (i === index ? segment : current)));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...segments];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  return (
    <section className="stack-tight" aria-label="Runs of days">
      <div className="section-heading">
        <h2 className="section-label">The cycle</h2>
        <span className="section-count">{cycleLength(segments)}-day cycle, then it repeats</span>
      </div>
      <ol className="run-list">
        {segments.map((segment, index) => (
          <RunCard
            key={index}
            segment={segment}
            index={index}
            count={segments.length}
            onChange={(next) => update(index, next)}
            onMove={(direction) => move(index, direction)}
            onRemove={() => onChange(segments.filter((_, i) => i !== index))}
          />
        ))}
      </ol>
      <div className="chip-row">
        <button type="button" className="chip" onClick={() => onChange([...segments, { days: 1, blocks: [defaultBlock] }])}>
          + Working days
        </button>
        <button type="button" className="chip" onClick={() => onChange([...segments, { days: 1, blocks: [] }])}>
          + Days off
        </button>
      </div>
    </section>
  );
}

function WeeklyEditor({ segments, onChange }: { segments: ScheduleSegment[]; onChange: (segments: ScheduleSegment[]) => void }) {
  const week = weekdayNames.map((_, index) => segments[index] ?? { days: 1, blocks: [] });
  const update = (index: number, blocks: TimeBlock[]) =>
    onChange(week.map((segment, i) => (i === index ? { days: 1, blocks } : segment)));

  return (
    <section className="stack-tight" aria-label="Days of the week">
      <h2 className="section-label">Each week</h2>
      <ul className="week-list">
        {weekdayNames.map((day, index) => {
          const block = week[index].blocks[0];
          return (
            <li key={day} className="week-day">
              <label className="week-day__toggle">
                <input
                  type="checkbox"
                  checked={Boolean(block)}
                  onChange={(event) => update(index, event.target.checked ? [week.find((s) => s.blocks[0])?.blocks[0] ?? defaultBlock] : [])}
                />
                <span>{day}</span>
              </label>
              {block && <BlockFields block={block} label={day} onChange={(next) => update(index, [next])} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function PatternEditor({ patternId, initial, onDone }: Props) {
  const [draft, setDraft] = useState<PatternInput>(initial);
  const [problems, setProblems] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const weekly = draft.layout === 'WEEKLY';
  const set = (changes: Partial<PatternInput>) => setDraft({ ...draft, ...changes });

  const previewPattern: SchedulePattern = {
    ...draft,
    id: patternId ?? 'preview',
    userId: 'preview',
    createdAt: '',
    updatedAt: '',
  };

  async function save() {
    try {
      if (patternId) await scheduleService.updatePattern(patternId, draft);
      else await scheduleService.createPattern(draft);
      onDone();
    } catch (error) {
      setProblems(error instanceof ScheduleValidationError ? error.problems : ['That schedule could not be saved.']);
    }
  }

  return (
    <div className="page">
      <div className="stack-tight">
        <label className="field-label" htmlFor="schedule-name">
          Name
        </label>
        <input
          id="schedule-name"
          className="field-input field-input--large"
          value={draft.name}
          placeholder="Work, Class, Care…"
          onChange={(event) => set({ name: event.target.value })}
        />
      </div>

      <div className="mini-segmented mini-segmented--wide" role="group" aria-label="Kind of time">
        <button type="button" aria-pressed={draft.kind === 'COMMITTED'} onClick={() => set({ kind: 'COMMITTED' })}>
          Work or commitment
        </button>
        <button type="button" aria-pressed={draft.kind === 'PROTECTED'} onClick={() => set({ kind: 'PROTECTED' })}>
          Protected time
        </button>
      </div>

      <div className="stack-tight">
        <label className="field-label" htmlFor="schedule-location">
          Where (optional)
        </label>
        <input
          id="schedule-location"
          className="field-input"
          value={draft.location ?? ''}
          placeholder="A place, if it helps"
          onChange={(event) => set({ location: event.target.value || undefined })}
        />
        <span className="field-label">Colour (optional)</span>
        <ColorChoice value={draft.color} onChange={(color) => set({ color })} />
      </div>

      <div className="stack-tight">
        <label className="field-label" htmlFor="schedule-start">
          {weekly ? 'Starting the week of' : 'First day of the cycle'}
        </label>
        <input
          id="schedule-start"
          type="date"
          className="field-input"
          value={draft.anchorDate}
          onChange={(event) =>
            set({ anchorDate: weekly && event.target.value ? mondayOnOrBefore(event.target.value) : event.target.value })
          }
        />
        {!weekly && <p className="sheet__hint">The day the first run begins. Any past date in the pattern works.</p>}
      </div>

      {weekly ? (
        <WeeklyEditor segments={draft.segments} onChange={(segments) => set({ segments })} />
      ) : (
        <CycleEditor segments={draft.segments} onChange={(segments) => set({ segments })} />
      )}

      <label className="toggle-check">
        <input
          type="checkbox"
          checked={Boolean(draft.pauseWhenEnds)}
          onChange={(event) => set({ pauseWhenEnds: event.target.checked || undefined })}
        />
        <span>
          Offer a one-minute pause when this ends
          <span className="toggle-check__hint">A quiet moment to arrive before the next part of your day.</span>
        </span>
      </label>

      <details className="stack-tight" open={Boolean(draft.endDate)}>
        <summary className="section-label">Ends on a date (optional)</summary>
        <div className="field-row">
          <input
            type="date"
            className="field-input"
            aria-label="End date"
            value={draft.endDate ?? ''}
            onChange={(event) => set({ endDate: event.target.value || undefined })}
          />
          {draft.endDate && (
            <button type="button" className="button-quiet" onClick={() => set({ endDate: undefined })}>
              Clear
            </button>
          )}
        </div>
      </details>

      <section className="stack-tight" aria-label="Preview">
        <h2 className="section-label">Next two weeks</h2>
        <p className="sheet__hint">Check this against your real calendar.</p>
        <SchedulePreview pattern={previewPattern} />
      </section>

      {problems.length > 0 && (
        <ul className="form-problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <div className="editor-actions">
        {patternId &&
          (confirmingDelete ? (
            <span className="editor-actions__confirm">
              <button type="button" className="button-quiet" onClick={() => setConfirmingDelete(false)}>
                Keep
              </button>
              <button
                type="button"
                className="chip"
                onClick={async () => {
                  await scheduleService.removePattern(patternId);
                  onDone();
                }}
              >
                Delete schedule
              </button>
            </span>
          ) : (
            <button type="button" className="button-quiet" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          ))}
        <span className="editor-actions__spacer" />
        <button type="button" className="button-quiet" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="button-accent" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
