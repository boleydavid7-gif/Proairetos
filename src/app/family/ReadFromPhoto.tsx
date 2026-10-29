import { useEffect, useRef, useState } from 'react';
import type { Found } from '../../core/ocr/labels';
import { readPhotoText } from './ocr';
import './readFromPhoto.css';
import { LampIcon } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';

/**
 * "Read from a photo" on a form: a photo of a label, plate or bill is read on the device, and what was found is shown
 * to look over (each value can be changed or left out) before it fills the form. Nothing is saved by this.
 */
/** Text read from a photo: the corners of a frame around two lines. */
const SCAN = { line: <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 10h8M8 14h5" />, lit: <></> };

export function ReadFromPhoto({ find, onUse, label = 'Read from a photo', initialFile, online }: { find: (text: string) => Found[]; onUse: (values: Record<string, string>) => void; label?: string; initialFile?: File; online?: (file: File) => Promise<Found[]> }) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<number>();
  const [text, setText] = useState<string>();
  const [found, setFound] = useState<(Found & { use: boolean })[]>([]);
  const [problem, setProblem] = useState('');
  const [photo, setPhoto] = useState<File>();
  const [onlineReading, setOnlineReading] = useState(false);

  const close = () => {
    setText(undefined);
    setFound([]);
    setProblem('');
    setPhoto(undefined);
  };

  const read = (file: File) => {
    close();
    setPhoto(file);
    setReading(0);
    void readPhotoText(file, setReading)
      .then((words) => {
        setText(words);
        setFound(find(words).map((each) => ({ ...each, use: true })));
      })
      .catch(() => setProblem('Couldn’t read the photo. The reader downloads once (about 7 MB), so check the connection and try again.'))
      .finally(() => setReading(undefined));
  };

  const readOnline = async () => {
    if (!online || !photo) return;
    setOnlineReading(true);
    setProblem('');
    try {
      const values = await online(photo);
      setFound(values.map((each) => ({ ...each, use: true })));
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'The online receipt reader could not read that photo.');
    } finally {
      setOnlineReading(false);
    }
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
          <LampIcon glyph={SCAN} size={18} />
          {reading !== undefined ? <Waiting>{`Reading… ${Math.round(reading * 100)}%`}</Waiting> : label}
        </button>
      )}
      {problem && <p className="read-photo__note" role="alert">{problem}</p>}
      {text !== undefined && (
        <div className="read-photo__panel" role="group" aria-label="Found in the photo">
          {found.length === 0 ? (
            <p className="read-photo__note">Nothing to fill in was found.</p>
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
          {online && photo && <p className="read-photo__note">The optional online reader sends this photo for this reading only; it is not saved by Proairetos.</p>}
          <div className="read-photo__actions">
            <button type="button" className="read-photo__quiet" onClick={close}>Cancel</button>
            <button type="button" className="read-photo__quiet" onClick={() => input.current?.click()}>Another photo</button>
            {online && photo && <button type="button" className="read-photo__quiet" disabled={onlineReading} onClick={() => void readOnline()}>{onlineReading ? 'Reading online…' : 'Try online reader'}</button>}
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
