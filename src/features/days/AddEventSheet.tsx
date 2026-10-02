import { useState, type FormEvent } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import ColorChoice from '../../components/ui/ColorChoice';
import { useSheet } from '../../components/ui/useSheet';
import type { TagColor } from '../../core/look/tagColors';
import type { RepeatRule } from '../../core/life-items/repeat';
import type { PlanGroup } from '../../core/life-items/types';
import { atTime } from '../../core/scheduling/dates';
import { formatLocalDay, formatTimeOf } from '../schedule/format';

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

/**
 * Adds something to a day: at a time (it shows on the day's timeline) or
 * any time that day (it shows in the day's to-dos). More holds the
 * person's own marks and lists that come back.
 */
export default function AddEventSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(date);
  const [timed, setTimed] = useState(true);
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<TagColor | undefined>();
  const [more, setMore] = useState(false);
  const [group, setGroup] = useState<Group | undefined>();
  const [asList, setAsList] = useState(false);
  const [lines, setLines] = useState('');
  const [repeat, setRepeat] = useState('weekly');
  const [error, setError] = useState('');
  const ready = title.trim() && day && (!timed || time);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError('');
    try {
      const marks = {
        source: 'MANUAL' as const,
        location,
        ...(color ? { color } : {}),
        important: group === 'IMPORTANT',
        ...(group && group !== 'IMPORTANT' ? { planGroup: group } : {}),
      };
      let message: string;
      let id: string;
      if (asList) {
        // A list that comes back: a routine whose lines clear each time it returns.
        const item = await lifeService.add(title, 'TODO', marks);
        await lifeService.setChecklist(item.id, lines.split('\n'));
        await lifeService.schedule(item.id, atTime(day, '00:00').toISOString());
        await lifeService.setRepeat(item.id, listRepeats.find((option) => option.id === repeat)!.rule);
        id = item.id;
        message = `Added: ${item.title}, from ${formatLocalDay(day)}`;
      } else if (timed) {
        const at = atTime(day, time);
        const item = await lifeService.add(title, 'TODO', marks);
        await lifeService.schedule(item.id, at.toISOString());
        id = item.id;
        message = `Added: ${item.title}, ${formatLocalDay(day)} ${formatTimeOf(at)}`;
      } else {
        const item = await lifeService.add(title, 'TODO', { ...marks, plannedFor: day });
        id = item.id;
        message = `Added: ${item.title}, ${formatLocalDay(day)}`;
      }
      offerUndo(message, async () => {
        await lifeService.deleteItem(id);
      });
      close();
    } catch {
      setError('Could not add that just now.');
    }
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Add to your days"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Cancel
        </button>
        <p className="sheet__title sheet__title--static">Add</p>
        <form className="stack-tight" onSubmit={save}>
          <input
            className="field-input field-input--large"
            aria-label="What"
            placeholder="What is it?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
          {!asList && (
            <div className="segmented segmented--two" role="tablist" aria-label="When that day">
              <button type="button" role="tab" className="segmented__option" aria-selected={timed} onClick={() => setTimed(true)}>
                At a time
              </button>
              <button type="button" role="tab" className="segmented__option" aria-selected={!timed} onClick={() => setTimed(false)}>
                Any time that day
              </button>
            </div>
          )}
          <div className="block-fields">
            <label className="block-fields__time">
              <span>{asList ? 'Starting' : 'Day'}</span>
              <input type="date" className="field-input" aria-label="Day" value={day} onChange={(event) => setDay(event.target.value)} />
            </label>
            {timed && !asList && (
              <label className="block-fields__time">
                <span>Time</span>
                <input type="time" className="field-input" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            )}
          </div>
          <input
            className="field-input"
            aria-label="Where"
            placeholder="Where (optional)"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <span className="field-label">Colour (optional)</span>
          <ColorChoice value={color} onChange={setColor} />

          <button type="button" className="text-link add-more" aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? 'Fewer options' : 'More options'}
          </button>
          {more && (
            <>
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
                  <p className="sheet__hint">It shows on its days by itself, with every line unticked.</p>
                </>
              )}
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="button-accent" disabled={!ready}>
            Add
          </button>
        </form>
      </div>
    </dialog>
  );
}
