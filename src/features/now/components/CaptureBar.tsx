import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { lifeService } from '../../../app/services';
import { OverlayContext } from '../../../app/overlays/OverlayContext';
import { Sym } from '../../../lamplight/icons';
import { describeQuickAdd, parseQuickAdd } from '../../../core/capture/quickAdd';
import { atTime, toLocalDate } from '../../../core/scheduling/dates';
import MicButton from '../../../components/dictation/MicButton';
import { CaptureIcon } from '../../../components/icons/Icons';
import type { ItemKind } from '../../../core/life-items/kinds';
import type { LifeItem } from '../../../core/life-items/types';

type Props = {
  /** A kind chosen above the box; it tags the next capture only. */
  kind?: ItemKind;
  placeholder?: string;
  onCaptured?: (item: LifeItem) => void;
  /** Quiet: a single underlined line, for Today. */
  variant?: 'box' | 'quiet';
};

export default function CaptureBar({ kind, placeholder = 'Capture something', onCaptured, variant = 'box' }: Props) {
  const [text, setText] = useState('');
  // "Keep as written": the day or time read from the words is set aside until the box is cleared.
  const [asWritten, setAsWritten] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const overlays = useContext(OverlayContext);
  const today = toLocalDate(new Date());
  // A day or time in the words ("dentist friday 3pm"), as Reminders and Todoist read them. Feelings, ideas and
  // concerns keep their words whole.
  const reads = !kind || kind === 'TODO' || kind === 'REMEMBER';
  const parsed = reads && !asWritten ? parseQuickAdd(text, today, new Date()) : null;
  const when = parsed && (parsed.day || parsed.time) ? describeQuickAdd({ ...parsed, minutes: parsed.time ? parsed.minutes : undefined }, today) : '';

  // Choosing a kind moves straight into typing.
  useEffect(() => {
    if (kind) input.current?.focus();
  }, [kind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = text;
    if (!value.trim()) return;
    const read = when ? parsed : null;
    // Clear right away so the next thought can be typed while this one saves.
    setText('');
    setAsWritten(false);
    try {
      const item = await lifeService.add(read ? read.title : value, kind, read?.day && !read.time ? { plannedFor: read.day } : {});
      if (read?.time) {
        const start = atTime(read.day ?? today, read.time);
        const end = read.minutes ? new Date(start.getTime() + read.minutes * 60_000) : undefined;
        await lifeService.scheduleSpan(item.id, start.toISOString(), end?.toISOString());
      }
      onCaptured?.(item);
      // On Today the new line is not in view, so say it was kept, with a way back.
      if (variant === 'quiet')
        overlays?.offerUndo(read ? `Added “${read.title}”, ${when}` : `Added “${item.title}”`, async () => {
          await lifeService.deleteItem(item.id);
        });
    } catch {
      setText((current) => current || value);
    }
  }

  return (
    <form aria-label="Capture" className={`capture-bar${variant === 'quiet' ? ' capture-bar--quiet' : ''}`} onSubmit={submit}>
      <CaptureIcon size={20} className="capture-bar__icon" />
      <input
        ref={input}
        className="capture-bar__input"
        placeholder={placeholder}
        aria-label="Capture something"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (!event.target.value.trim()) setAsWritten(false);
        }}
      />
      {/* The mic stays mounted while text arrives, so dictation keeps listening across phrases. */}
      {variant === 'box' && <MicButton onText={(spoken) => setText((current) => (current ? `${current} ${spoken}` : spoken))} />}
      {text.trim() && (
        <button type="submit" className="capture-bar__submit">
          Add
        </button>
      )}
      {when && (
        <p className="capture-bar__when" aria-live="polite">
          <span>{when}</span>
          <button type="button" className="capture-bar__as-written" aria-label="Keep the words as written" onClick={() => setAsWritten(true)}>
            <Sym name="close" />
          </button>
        </p>
      )}
    </form>
  );
}
