import { useEffect, useRef } from 'react';

/*
 * Listening for a few spoken words while hands are busy (cooking, between sets): the phone's own speech
 * recognition, only while the page asks for it and the person turned it on. Nothing is kept.
 */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

const Listener =
  (globalThis as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
  (globalThis as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

export function listeningHere(): boolean {
  return Boolean(Listener);
}

/** Hands each heard phrase (lower case) to `heard` while `on`. Phones stop listening now and then; it starts again. */
export function useListening(on: boolean, heard: (words: string) => void, refused?: () => void): void {
  const latest = useRef({ heard, refused });
  latest.current = { heard, refused };
  useEffect(() => {
    if (!on || !Listener) return;
    let stopped = false;
    const ear = new Listener();
    ear.continuous = true;
    ear.interimResults = false;
    ear.lang = navigator.language || 'en-US';
    ear.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) latest.current.heard(event.results[i][0].transcript.toLowerCase().trim());
    };
    ear.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopped = true;
        latest.current.refused?.();
      }
    };
    ear.onend = () => {
      if (stopped) return;
      try {
        ear.start();
      } catch {
        // Already listening.
      }
    };
    try {
      ear.start();
    } catch {
      // Listening refused.
    }
    return () => {
      stopped = true;
      ear.stop();
    };
  }, [on]);
}

/** Whether a phrase holds one of the words, as a whole word. */
export const says = (words: string, ...any: string[]) => any.some((word) => new RegExp(`\\b${word}\\b`).test(words));
