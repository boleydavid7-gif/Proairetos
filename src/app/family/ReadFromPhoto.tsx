import { useEffect, useRef, useState } from 'react';
import type { Found } from '../../core/ocr/labels';
import { readPhotoText } from './ocr';
import './readFromPhoto.css';

/**
 * "Read from a photo" on a form: a photo of a label, plate or bill is read on the phone, and what was found is shown
 * to look over (each value can be changed or left out) before it fills the form. Nothing is saved by this.
 */
export function ReadFromPhoto({ find, onUse, label = 'Read from a photo', initialFile }: { find: (text: string) => Found[]; onUse: (values: Record<string, string>) => void; label?: string; initialFile?: File }) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<number>();
  const [text, setText] = useState<string>();
  const [found, setFound] = useState<(Found & { use: boolean })[]>([]);
  const [problem, setProblem] = useState('');

  const close = () => {
    setText(undefined);
    setFound([]);
    setProblem('');
  };

  const read = (file: File) => {
    close();
    setReading(0);
    void readPhotoText(file, setReading)
      .then((words) => {
        setText(words);
        setFound(find(words).map((each) => ({ ...each, use: true })));
      })
      .catch(() => setProblem('The photo could not be read here. Check the connection the first time (the reader is about 7 MB), then try again.'))
      .finally(() => setReading(undefined));
  };

  // A photo shared into the app is read straight away.
  useEffect(() => {
    if (initialFile) read(initialFile);
  }, [initialFile]);

  return (
    <div className="read-photo">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) read(file);
        }}
      />
      {text === undefined && (
        <button type="button" className="read-photo__start" disabled={reading !== undefined} onClick={() => input.current?.click()}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 10h8M8 14h5" />
          </svg>
          {reading !== undefined ? `Reading… ${Math.round(reading * 100)}%` : label}
        </button>
      )}
      {problem && <p className="read-photo__note" role="alert">{problem}</p>}
      {text !== undefined && (
        <div className="read-photo__panel" role="group" aria-label="Found in the photo">
          {found.length === 0 ? (
            <p className="read-photo__note">Nothing to fill in was found. A closer, straighter photo in good light reads best.</p>
          ) : (
            found.map((each, i) => (
              <label key={each.key} className="read-photo__row">
                <input type="checkbox" checked={each.use} onChange={(event) => setFound((all) => all.map((one, j) => (j === i ? { ...one, use: event.target.checked } : one)))} />
                <span className="read-photo__label">{each.label}</span>
                <input
                  className="read-photo__value"
                  aria-label={each.label}
                  value={each.value}
                  onChange={(event) => setFound((all) => all.map((one, j) => (j === i ? { ...one, value: event.target.value } : one)))}
                />
              </label>
            ))
          )}
          {text.trim() && (
            <details className="read-photo__all">
              <summary>All the text it read</summary>
              <pre>{text.trim()}</pre>
            </details>
          )}
          <div className="read-photo__actions">
            <button type="button" className="read-photo__quiet" onClick={close}>Cancel</button>
            <button type="button" className="read-photo__quiet" onClick={() => input.current?.click()}>Another photo</button>
            {found.some((each) => each.use && each.value.trim()) && (
              <button
                type="button"
                className="read-photo__use"
                onClick={() => {
                  onUse(Object.fromEntries(found.filter((each) => each.use && each.value.trim()).map((each) => [each.key, each.value.trim()])));
                  close();
                }}
              >
                Fill in
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
