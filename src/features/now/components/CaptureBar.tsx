import { useEffect, useRef, useState, type FormEvent } from 'react';
import { lifeService } from '../../../app/services';
import MicButton from '../../../components/dictation/MicButton';
import { CaptureIcon } from '../../../components/icons/Icons';
import type { CaptureKind } from '../../../core/life-items/types';

type Props = {
  /** A kind chosen above the box; it tags the next capture only. */
  kind?: CaptureKind;
  placeholder?: string;
  onCaptured?: () => void;
  /** Quiet: a single underlined line, for Today. */
  variant?: 'box' | 'quiet';
};

export default function CaptureBar({ kind, placeholder = 'Capture something', onCaptured, variant = 'box' }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  // Choosing a kind moves straight into typing.
  useEffect(() => {
    if (kind) input.current?.focus();
  }, [kind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = text;
    if (!value.trim()) return;
    // Clear right away so the next thought can be typed while this one saves.
    setText('');
    try {
      await lifeService.capture(value, null, kind ? { captureKind: kind } : {});
      onCaptured?.();
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
        onChange={(event) => setText(event.target.value)}
      />
      {text.trim() ? (
        <button type="submit" className="capture-bar__submit">
          Add
        </button>
      ) : (
        variant === 'box' && <MicButton onText={(spoken) => setText((current) => (current ? `${current} ${spoken}` : spoken))} />
      )}
    </form>
  );
}
