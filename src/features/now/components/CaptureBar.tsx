import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { lifeService } from '../../../app/services';
import { OverlayContext } from '../../../app/overlays/OverlayContext';
import { Sym } from '../../../lamplight/icons';
import { describeQuickAdd, parseQuickAdd } from '../../../core/capture/quickAdd';
import { readDump } from '../../../core/capture/brainDump';
import { atTime, toLocalDate } from '../../../core/scheduling/dates';
import MicButton from '../../../components/dictation/MicButton';
import { CaptureIcon } from '../../../components/icons/Icons';
import type { ItemKind } from '../../../core/life-items/kinds';
import type { LifeItem } from '../../../core/life-items/types';
import { notifications } from '../../../app/notify/notifications';
import { markRemindOfferSeen, remindOfferSeen } from '../../../data/storage/preferences';

type Props = {
  /** A kind chosen above the box; it tags the next capture only. */
  kind?: ItemKind;
  onCaptured?: (item: LifeItem) => void;
  /** Quiet: a single underlined line, for Today. */
  variant?: 'box' | 'quiet';
  /** Text for the primary action. Capture shelves use Add; the fast entry page uses Save. */
  submitLabel?: string;
  /** Focus the field as soon as the capture surface appears. */
  autoFocus?: boolean;
  /** Keep the voice affordance available unless a deliberately minimal surface hides it. */
  showMic?: boolean;
};

export default function CaptureBar({ kind, onCaptured, variant = 'box', submitLabel = 'Add', autoFocus = false, showMic = true }: Props) {
  const [text, setText] = useState('');
  // "Keep as written": the day or time read from the words is set aside until the box is cleared.
  const [asWritten, setAsWritten] = useState(false);
  // Something given a time is only reminded once the phone allows it: the first time, that is said once, with Allow.
  const [offerReminders, setOfferReminders] = useState(false);
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
      // A plain unsorted capture may contain several clear actions. Keep scheduled quick-add
      // phrases together so their date and time remain unambiguous.
      const titles = !kind && !read ? readDump(value, today).map((line) => line.text) : [read ? read.title : value];
      const captured: LifeItem[] = [];
      for (const title of titles) {
        // Something given a day or time is something to do; plain split captures stay unsorted.
        const item = await lifeService.add(title, read ? (kind ?? 'TODO') : kind, read?.day && !read.time ? { plannedFor: read.day } : {});
        captured.push(item);
        if (read?.time) {
          const start = atTime(read.day ?? today, read.time);
          const end = read.minutes ? new Date(start.getTime() + read.minutes * 60_000) : undefined;
          await lifeService.scheduleSpan(item.id, start.toISOString(), end?.toISOString());
          if (notifications.permission() === 'default' && !remindOfferSeen()) setOfferReminders(true);
        }
      }
      captured.forEach((item) => onCaptured?.(item));
      // On Today the new line is not in view, so say it was kept, with a way back.
      if (variant === 'quiet') {
        const message = captured.length > 1
          ? `${captured.length} things added`
          : read
            ? `“${captured[0].title}” added, ${when}`
            : `“${captured[0].title}” added`;
        overlays?.offerUndo(message, async () => {
          for (const item of captured) await lifeService.deleteItem(item.id);
        });
      }
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
        aria-label="Capture something"
        autoFocus={autoFocus}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (!event.target.value.trim()) setAsWritten(false);
        }}
      />
      {/* The mic stays mounted while text arrives, so dictation keeps listening across phrases. */}
      {variant === 'box' && showMic && <MicButton onText={(spoken) => setText((current) => (current ? `${current} ${spoken}` : spoken))} />}
      {text.trim() && (
        <button type="submit" className="capture-bar__submit">
          {submitLabel}
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
      {offerReminders && !when && (
        <p className="capture-bar__when capture-bar__remind">
          <span>Reminders need your permission on this phone.</span>
          <button
            type="button"
            className="chip chip--small chip--accent"
            onClick={() => {
              markRemindOfferSeen();
              setOfferReminders(false);
              void notifications.ask();
            }}
          >
            Allow
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              markRemindOfferSeen();
              setOfferReminders(false);
            }}
          >
            Not now
          </button>
        </p>
      )}
    </form>
  );
}
