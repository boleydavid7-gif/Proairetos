import { useEffect, useState } from 'react';
import { audio, buffer, gain, letGo, playOnce, wakeAudio } from '../../app/sound/engine';
import { BELL_FILE } from '../../app/sound/soundscapes';

/**
 * Kitchen timers started from a recipe's steps, named from the step
 * ("Simmer the rice"), several at once. Each bell is handed to the audio
 * clock when the timer starts, so it rings on time with the screen locked
 * (the page plays as media while any timer runs, as Askesis does on a run).
 */
export type Timer = { id: string; name: string; label: string; endsAt: number; done?: boolean };

let timers: Timer[] = [];
const bells = new Map<string, AudioBufferSourceNode[]>();
const listeners = new Set<() => void>();
const told = () => listeners.forEach((listener) => listener());
let ticking: number | undefined;

const RINGS = 3;
const GAP = 2.2;

async function scheduleBell(id: string, seconds: number): Promise<boolean> {
  try {
    const data = await buffer(BELL_FILE);
    const ctx = audio();
    const out = gain(ctx, 0.9);
    out.connect(ctx.destination);
    const start = ctx.currentTime + Math.max(0.05, seconds);
    const sources = Array.from({ length: RINGS }, (_, i) => {
      const source = ctx.createBufferSource();
      source.buffer = data;
      source.connect(out);
      source.start(start + i * GAP);
      return source;
    });
    bells.set(id, sources);
    return true;
  } catch {
    return false;
  }
}

function silence(id: string) {
  for (const source of bells.get(id) ?? []) {
    try {
      source.stop();
    } catch {
      // Already rung.
    }
  }
  bells.delete(id);
}

function tick() {
  const now = Date.now();
  let rang = false;
  timers = timers.map((timer) => {
    if (!timer.done && timer.endsAt <= now) {
      rang = true;
      // No bell on the audio clock (it could not be loaded): ring now instead.
      if (!bells.has(timer.id)) void playOnce(BELL_FILE, audio().destination).catch(() => undefined);
      window.setTimeout(() => {
        bells.delete(timer.id);
        letGo();
      }, RINGS * GAP * 1000 + 1500);
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
  }
  told();
  if (!timers.some((timer) => !timer.done)) {
    window.clearInterval(ticking);
    ticking = undefined;
  }
}

/** Starts a timer from a tap (so the bell may sound later, even with the screen locked). */
export function startTimer(label: string, minutes: number, name = label): void {
  wakeAudio();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  timers = [...timers, { id, name, label, endsAt: Date.now() + minutes * 60_000 }];
  void scheduleBell(id, minutes * 60);
  ticking ??= window.setInterval(tick, 1000);
  told();
}

export function stopTimer(id: string): void {
  const timer = timers.find((each) => each.id === id);
  if (timer && !timer.done) {
    silence(id);
    letGo();
  }
  timers = timers.filter((each) => each.id !== id);
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
