import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { audio, buffer, gain, letGo, playOnce, wakeAudio } from '../../app/sound/engine';
import { player } from '../../app/sound/player';
import { BELL_FILE } from '../../app/sound/soundscapes';
import { breathAt, breathPattern, type BreathStepKind } from '../../core/meditate/breathing';
import { cueAt, session, sessionCues } from '../../core/meditate/sessions';
import type { SitKind, SitSetup } from '../../core/meditate/setup';
import { PauseIcon, PlayIcon } from '../../components/icons/Icons';
import BreathCircle from './BreathCircle';
import lake from '../../assets/images/scenes/lake.webp';

/** A sit about to begin: its kind and how the person set it up. */
export type SitPlan = { kind: SitKind; setup: SitSetup };

/** The recorded breath for a step, at its own pace, starting as the step does. */
function breathFile(kind: BreathStepKind): string | undefined {
  return kind === 'in' || kind === 'out' ? `/sounds/breath-${kind}.mp3` : undefined;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

let voicesReady: Promise<SpeechSynthesisVoice[]> | undefined;
let speechGeneration = 0;

function speech(): SpeechSynthesis | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return undefined;
  return window.speechSynthesis;
}

function voices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const existing = synth.getVoices();
  if (existing.length) return Promise.resolve(existing);
  voicesReady ??= new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, 600);
  });
  return voicesReady;
}

function speak(text: string): void {
  const synth = speech();
  if (!synth) return;
  const generation = ++speechGeneration;
  synth.cancel();
  const line = new window.SpeechSynthesisUtterance(text);
  line.rate = 0.82;
  line.pitch = 0.95;
  line.volume = 0.9;
  line.lang = navigator.language || 'en-US';
  void voices(synth).then((available) => {
    if (generation !== speechGeneration) return;
    const language = line.lang.toLowerCase().split('-')[0];
    line.voice = available.find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? available[0] ?? null;
    synth.resume();
    // Safari can discard speak() when it immediately follows cancel().
    window.setTimeout(() => {
      if (generation === speechGeneration) synth.speak(line);
    }, 60);
  });
}

/** Unlocks speech from the Start tap; iPhone Safari can ignore later timer-only calls otherwise. */
export function primeSpeech(): void {
  const synth = speech();
  if (!synth) return;
  speechGeneration += 1;
  try {
    synth.cancel();
    synth.resume();
    const warmup = new window.SpeechSynthesisUtterance(' ');
    warmup.volume = 0;
    warmup.rate = 10;
    synth.speak(warmup);
    window.setTimeout(() => synth.cancel(), 120);
  } catch {
    // Spoken cues remain visible if this browser does not expose speech output.
  }
}

function hush(): void {
  speechGeneration += 1;
  try {
    speech()?.cancel();
  } catch {
    // Nothing to stop.
  }
}

/**
 * A sit or a breathing round, full screen over the lake. One clock drives
 * the circle, the counts, the breath sounds, and the cues; pausing stops
 * them all together. Leaving early is always one tap, and nothing is kept.
 */
export default function SitScreen({ plan, onClose }: { plan: SitPlan; onClose: () => void }) {
  const { setup } = plan;
  const script = plan.kind === 'breathe' ? undefined : session(plan.kind);
  const pattern = breathPattern(setup.pace);
  const total = setup.minutes * 60;
  const [cues] = useState(() => (script ? sessionCues(script, setup.minutes, setup.guidance) : []));

  // The clock: time banked before the last pause, plus time since resuming.
  const banked = useRef(0);
  const since = useRef<number | null>(performance.now());
  const elapsed = useCallback(
    () => (banked.current + (since.current === null ? 0 : performance.now() - since.current)) / 1000,
    [],
  );
  const [running, setRunning] = useState(true);
  const [now, setNow] = useState(0);
  const done = now >= total;

  const effects = useRef<GainNode | null>(null);
  const scheduled = useRef(new Set<number>());
  const spoken = useRef(-1);
  const faded = useRef(false);

  const leave = useCallback(() => {
    hush();
    // A paused sit holds the whole audio clock; let other sounds carry on.
    void audio().resume();
    player.stop(2);
    onClose();
  }, [onClose]);
  useBackHandler(true, leave);

  // Start: the bell, the chosen sound, and the screen kept awake.
  useEffect(() => {
    // Woken by the Start tap already; this hold lasts as long as the screen.
    wakeAudio();
    const ctx = audio();
    effects.current = gain(ctx, 0.9);
    effects.current.connect(ctx.destination);
    // The sounds were started by the Start tap itself (phones only begin sound there).
    if (setup.bells) void playOnce(BELL_FILE, effects.current, 0.3).catch(() => undefined);
    let lock: { release(): Promise<void> } | undefined;
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (!script?.fadeOut) nav.wakeLock?.request('screen').then((held) => (lock = held)).catch(() => undefined);
    return () => {
      hush();
      void lock?.release().catch(() => undefined);
      const bus = effects.current;
      // Let the last bell ring out before letting go.
      window.setTimeout(() => {
        bus?.disconnect();
        letGo();
      }, 15_000);
    };
    // Runs once for the life of the screen.
  }, []);

  // The ticking: time left, cues, the sleep fade, and the end.
  useEffect(() => {
    const id = window.setInterval(() => {
      const seconds = elapsed();
      setNow(seconds);
      if (script) {
        const cue = cueAt(cues, seconds);
        if (cue && cue.at !== spoken.current && running) {
          spoken.current = cue.at;
          if (setup.speak && seconds - cue.at < 3) speak(cue.text);
        }
        if (script.fadeOut && !faded.current && total - seconds <= 60) {
          faded.current = true;
          player.stop(Math.max(1, total - seconds));
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [elapsed, cues, script, setup, total, running]);

  // Breath sounds, a real breath, scheduled a little ahead on the audio clock.
  useEffect(() => {
    if (!setup.breathSounds || !running || done) return;
    const ctx = audio();
    // Keep the recordings quiet beside spoken cues and any chosen soundscape.
    // The source files are intentionally quiet; a unity-gain bus made them
    // feel much closer than the original recordings.
    const bus = gain(ctx, 0.45);
    bus.connect(ctx.destination);
    scheduled.current.clear();
    // Fetch the few files this pattern uses before the first one is due.
    for (const step of pattern.steps) {
      const file = breathFile(step.kind);
      if (file) void buffer(file).catch(() => undefined);
    }
    // The scheduler below looks ahead to the step after the one currently
    // under way. Start the first cycle explicitly so every pattern begins
    // with its inhale instead of making the first audible cue an exhale.
    const firstFile = breathFile(pattern.steps[0]?.kind);
    if (firstFile) void playOnce(firstFile, bus).catch(() => undefined);
    const id = window.setInterval(() => {
      const at = elapsed();
      let moment = breathAt(at, pattern);
      // From the next step onwards; a step already under way stays quiet.
      let start = moment.stepStart + moment.step.seconds;
      while (start < at + 1.2 && start < total) {
        moment = breathAt(start + 0.001, pattern);
        const key = Math.round(start * 1000);
        const file = breathFile(moment.step.kind);
        if (file && !scheduled.current.has(key)) {
          scheduled.current.add(key);
          void playOnce(file, bus, Math.max(0, start - at)).catch(() => undefined);
        }
        start += moment.step.seconds;
      }
    }, 200);
    return () => {
      window.clearInterval(id);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      window.setTimeout(() => bus.disconnect(), 600);
    };
  }, [setup, running, done, elapsed, pattern, total]);

  // The end: a bell (or the quiet end of a sleep sit), and the sound eases away.
  useEffect(() => {
    if (!done) return;
    since.current = null;
    banked.current = total * 1000;
    hush();
    if (setup.bells && effects.current) void playOnce(BELL_FILE, effects.current, 0.1).catch(() => undefined);
    player.stop(script?.fadeOut ? 2 : 8);
  }, [done, script, setup, total]);

  function toggle() {
    if (running) {
      banked.current += performance.now() - (since.current ?? performance.now());
      since.current = null;
      hush();
      audio().suspend().catch(() => undefined);
    } else {
      since.current = performance.now();
      wakeAudio();
      letGo();
    }
    setRunning(!running);
  }

  const cue = script ? cueAt(cues, now) : undefined;
  const title = script ? script.title : pattern.title;

  return (
    <div className={`sit-screen${script?.fadeOut ? ' sit-screen--sleep' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sit-screen__scene" style={{ backgroundImage: `url(${lake})` }} aria-hidden="true" />
      <button type="button" className="sit-screen__leave" onClick={leave}>
        {done ? 'Close' : 'End'}
      </button>
      {done ? (
        <div className="sit-screen__center sit-screen__center--done">
          <p className="sit-screen__title">{script?.fadeOut ? 'Rest well.' : 'Welcome back.'}</p>
          <p className="sit-screen__cue">Take your time before you move on.</p>
          <button type="button" className="button-accent sit-screen__done" onClick={leave}>
            Done
          </button>
        </div>
      ) : (
        <div className="sit-screen__center">
          <p className="sit-screen__eyebrow">{title}</p>
          {setup.counts ? (
            <BreathCircle pattern={pattern} elapsed={elapsed} show="counts" />
          ) : (
            <BreathCircle pattern={pattern} elapsed={elapsed} show="caption" caption={clock(total - now)} />
          )}
          <p className="sit-screen__cue" key={cue?.at ?? 'none'}>
            {cue?.text ?? (plan.kind === 'breathe' ? 'Follow the circle. Breathe through the nose if that is easy.' : '')}
          </p>
          <div className="sit-screen__controls">
            <span className="sit-screen__time">{setup.counts ? `${clock(total - now)} left` : ''}</span>
            <button
              type="button"
              className="sit-screen__toggle"
              aria-label={running ? 'Pause' : 'Carry on'}
              onClick={toggle}
            >
              {running ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
            </button>
            <span className="sit-screen__time" />
          </div>
          {!running && <p className="sit-screen__paused">Paused. Carry on when you are ready.</p>}
        </div>
      )}
    </div>
  );
}
