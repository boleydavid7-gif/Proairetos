import { useState, type FormEvent } from 'react';
import { lifeService } from '../../../app/services';

export default function CaptureBar() {
  const [text, setText] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await lifeService.capture(text);
    setText('');
  }

  return (
    <form aria-label="Capture" className="card capture-bar" onSubmit={submit}>
      <input
        className="capture-bar__input"
        placeholder="Capture something"
        aria-label="Capture something"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button type="submit" className="capture-bar__submit" disabled={!text.trim()}>
        Add
      </button>
    </form>
  );
}
