import { useEffect, useState } from 'react';
import { audio, playOnce, wakeAudio } from '../../app/sound/engine';
import { BELL_FILE } from '../../app/sound/soundscapes';

/**
 * Kitchen timers started from a recipe's steps. They live while the app is
 * open, across pages, and ring a bell (and buzz, where the phone allows)
 * when they finish.
 */
export type Timer = { id: string; label: string; endsAt: number; done?: boolean };

let timers: Timer[] = [];
const listeners = new Set<() => void>();
const told = () => listeners.forEach((listener) => listener());
let ticking: number | undefined;

function tick() {
  const now = Date.now();
  let rang = false;
  timers = timers.map((timer) => {
    if (!timer.done && timer.endsAt <= now) {
      rang = true;
      return { ...timer, done: true };
    }
    return timer;
  });
  if (rang) {
    try {
      navigator.vibrate?.([300, 150, 300]);
    } catch {
      // The bell is enough.
    }
    void playOnce(BELL_FILE, audio().destination).catch(() => undefined);
  }
  told();
  if (!timers.some((timer) => !timer.done)) {
    window.clearInterval(ticking);
    ticking = undefined;
  }
}

/** Starts a timer from a tap (so the bell may sound later). */
export function startTimer(label: string, minutes: number): void {
  wakeAudio();
  timers = [...timers, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label, endsAt: Date.now() + minutes * 60_000 }];
  ticking ??= window.setInterval(tick, 1000);
  told();
}

export function stopTimer(id: string): void {
  timers = timers.filter((timer) => timer.id !== id);
  told();
}

export function useTimers(): Timer[] {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const update = () => setVersion((v) => v + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return timers;
}

export function timeLeft(timer: Timer): string {
  const seconds = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
