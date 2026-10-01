import { useState, type FormEvent } from 'react';
import { lifeService } from '../../../app/services';
import { CaptureIcon } from '../../../components/icons/Icons';

export default function CaptureBar() {
  const [text, setText] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await lifeService.capture(text);
    setText('');
  }

  return (
    <form aria-label="Capture" className="capture-bar" onSubmit={submit}>
      <CaptureIcon size={20} className="capture-bar__icon" />
      <input
        className="capture-bar__input"
        placeholder="Capture something"
        aria-label="Capture something"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {text.trim() && (
        <button type="submit" className="capture-bar__submit">
          Add
        </button>
      )}
    </form>
  );
}
