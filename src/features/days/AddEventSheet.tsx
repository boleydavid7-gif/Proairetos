import { useState, type FormEvent } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import ColorChoice from '../../components/ui/ColorChoice';
import { useSheet } from '../../components/ui/useSheet';
import type { TagColor } from '../../core/look/tagColors';
import { atTime } from '../../core/scheduling/dates';
import { formatLocalDay, formatTimeOf } from '../schedule/format';

/** Something with a day and a time: an appointment, a call, a plan. Saved as an item with a time, so it shows on Today. */
export default function AddEventSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { offerUndo } = useOverlays();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(date);
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<TagColor | undefined>();
  const [error, setError] = useState('');
  const ready = title.trim() && day && time;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError('');
    try {
      const at = atTime(day, time);
      const item = await lifeService.capture(title, 'DO', { source: 'MANUAL', location, ...(color ? { color } : {}) });
      await lifeService.schedule(item.id, at.toISOString());
      offerUndo(`Added: ${item.title}, ${formatLocalDay(day)} ${formatTimeOf(at)}`, async () => {
        await lifeService.deleteItem(item.id);
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
          <div className="block-fields">
            <label className="block-fields__time">
              <span>Day</span>
              <input type="date" className="field-input" aria-label="Day" value={day} onChange={(event) => setDay(event.target.value)} />
            </label>
            <label className="block-fields__time">
              <span>Time</span>
              <input type="time" className="field-input" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
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
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="button-accent" disabled={!ready}>
            Add
          </button>
        </form>
      </div>
    </dialog>
  );
}
