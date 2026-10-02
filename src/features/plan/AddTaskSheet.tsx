import { useState, type FormEvent } from 'react';
import { lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import type { PlanGroup } from '../../core/life-items/types';
import { formatLocalDay } from '../schedule/format';
import { atTime } from '../../core/scheduling/dates';
import type { RepeatRule } from '../../core/life-items/repeat';

const listRepeats: { id: string; label: string; rule: RepeatRule }[] = [
  { id: 'daily', label: 'Every day', rule: { kind: 'EVERY_N_DAYS', interval: 1 } },
  { id: 'weekdays', label: 'Weekdays', rule: { kind: 'WEEKDAYS', days: [0, 1, 2, 3, 4] } },
  { id: 'weekly', label: 'Every week', rule: { kind: 'EVERY_N_DAYS', interval: 7 } },
  { id: 'fortnightly', label: 'Every 2 weeks', rule: { kind: 'EVERY_N_DAYS', interval: 14 } },
];

type Group = 'IMPORTANT' | PlanGroup;

const groups: { id: Group; label: string }[] = [
  { id: 'IMPORTANT', label: 'Important' },
  { id: 'MAINTENANCE', label: 'Maintenance' },
  { id: 'MEANINGFUL', label: 'Meaningful' },
];

export default function AddTaskSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { dialog, panel } = useSheet();
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState<Group | undefined>();
  const [added, setAdded] = useState(0);
  const [asList, setAsList] = useState(false);
  const [lines, setLines] = useState('');
  const [repeat, setRepeat] = useState<string>('weekly');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const marks = { important: group === 'IMPORTANT', planGroup: group === 'IMPORTANT' ? undefined : group };
    if (asList) {
      // A list that comes back: a routine whose lines clear each time it returns.
      const item = await lifeService.capture(title, 'DO', { source: 'MANUAL', ...marks });
      await lifeService.setChecklist(item.id, lines.split('\n'));
      await lifeService.schedule(item.id, atTime(date, '00:00').toISOString());
      await lifeService.setRepeat(item.id, listRepeats.find((option) => option.id === repeat)!.rule);
      setLines('');
    } else {
      await lifeService.capture(title, 'DO', { source: 'MANUAL', plannedFor: date, ...marks });
    }
    // Stays open, so a few can be added in a row.
    setTitle('');
    setAdded(added + 1);
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Add a task"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => dialog.current?.close()}>
          {added > 0 ? 'Done' : 'Cancel'}
        </button>
        <p className="sheet__title sheet__title--static">Add a task</p>
        <p className="sheet__hint">For {formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
        <form className="stack-tight" onSubmit={submit}>
          <input
            className="field-input"
            autoFocus
            aria-label="Task"
            placeholder="What do you want to do?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="chip-row" role="group" aria-label="Group (optional)">
            {groups.map((option) => (
              <button
                key={option.id}
                type="button"
                className="chip"
                aria-pressed={group === option.id}
                onClick={() => setGroup(group === option.id ? undefined : option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="toggle-row" aria-pressed={asList} onClick={() => setAsList(!asList)}>
            <span className={`toggle-switch${asList ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
            <span>Make it a list that comes back</span>
          </button>
          {asList && (
            <>
              <textarea
                className="field-input field-input--area"
                rows={4}
                aria-label="List lines, one per line"
                placeholder={'One per line, e.g.\nLaundry\nPlan meals\nWater plants'}
                value={lines}
                onChange={(event) => setLines(event.target.value)}
              />
              <div className="chip-row" role="group" aria-label="Comes back">
                {listRepeats.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="chip"
                    aria-pressed={repeat === option.id}
                    onClick={() => setRepeat(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="sheet__hint">It appears on Plan by itself, starting this day, with every line unticked.</p>
            </>
          )}
          <button type="submit" className="button-accent" disabled={!title.trim()}>
            Add
          </button>
          {added > 0 && <p className="sheet__hint">Added. Add another, or close.</p>}
        </form>
      </div>
    </dialog>
  );
}
