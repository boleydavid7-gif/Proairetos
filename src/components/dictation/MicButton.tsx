import { useEffect, useRef, useState } from 'react';
import { acceptDictation, dictationAccepted } from '../../data/storage/preferences';
import { MicIcon } from '../icons/Icons';
import { useSheet } from '../ui/useSheet';

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionClass(): (new () => Recognition) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Dictation is offered only where the browser has it. */
export const dictationSupported = () => typeof window !== 'undefined' && recognitionClass() !== undefined;

function Notice({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="About dictation"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => close()}>
          Not now
        </button>
        <p className="sheet__title sheet__title--static">Before you dictate</p>
        <p className="section-description">
          Your browser turns speech into text using your phone maker’s speech service (Apple or Google). What you say is
          sent to them for that, the same as the microphone on your keyboard. Proairetos only receives the text.
        </p>
        <p className="section-description">If you would rather keep it all on this device, type instead.</p>
        <button
          type="button"
          className="button-accent button-accent--wide"
          onClick={() => {
            acceptDictation();
            onAccept();
            close();
          }}
        >
          Use dictation
        </button>
      </div>
    </dialog>
  );
}

/**
 * A microphone that adds spoken words to a field. Shown only where the
 * browser supports speech recognition; the first use explains where the
 * speech goes and asks before anything is sent.
 */
export default function MicButton({ onText, className = '' }: { onText: (text: string) => void; className?: string }) {
  const [listening, setListening] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const latest = useRef(onText);
  latest.current = onText;

  useEffect(() => () => recognition.current?.stop(), []);

  if (!dictationSupported()) return null;

  function start() {
    const Recognition = recognitionClass()!;
    const instance = new Recognition();
    instance.lang = navigator.language || 'en-US';
    instance.interimResults = false;
    instance.continuous = true;
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) latest.current(result[0].transcript.trim());
      }
    };
    instance.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access is off for this app. You can allow it in your browser settings.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('Dictation stopped. You can try again or type.');
      }
    };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setError('');
    setListening(true);
    instance.start();
  }

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    if (!dictationAccepted()) {
      setAsking(true);
      return;
    }
    start();
  }

  return (
    <>
      <button
        type="button"
        className={`mic-button${listening ? ' mic-button--listening' : ''} ${className}`}
        aria-label={listening ? 'Stop dictating' : 'Dictate'}
        aria-pressed={listening}
        onClick={toggle}
      >
        <MicIcon size={20} />
      </button>
      {error && (
        <span className="mic-button__error" role="status">
          {error}
        </span>
      )}
      {asking && <Notice onAccept={start} onClose={() => setAsking(false)} />}
    </>
  );
}
