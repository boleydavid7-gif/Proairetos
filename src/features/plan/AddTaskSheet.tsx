import { useState, type FormEvent } from 'react';
import { lifeService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import type { PlanGroup } from '../../core/life-items/types';
import { formatLocalDay } from '../schedule/format';

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await lifeService.capture(title, 'DO', {
      source: 'MANUAL',
      plannedFor: date,
      important: group === 'IMPORTANT',
      planGroup: group === 'IMPORTANT' ? undefined : group,
    });
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
          <button type="submit" className="button-accent" disabled={!title.trim()}>
            Add
          </button>
          {added > 0 && <p className="sheet__hint">Added. Add another, or close.</p>}
        </form>
      </div>
    </dialog>
  );
}
