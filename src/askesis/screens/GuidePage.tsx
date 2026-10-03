import { useEffect, useMemo, useRef, useState } from 'react';
import { tap } from '../../app/feel';
import { audio, buffer, letGo, wakeAudio } from '../../app/sound/engine';
import { BELL_FILE } from '../../app/sound/soundscapes';
import { pauseSongs, playSongs, resumeSongs, skipSong, stopSongs, useNowPlaying } from '../app/music';
import { cancelCues, scheduleCues } from '../app/runAudio';
import { cuesFor } from '../core/cues';
import type { Nav } from '../app/App';
import { LockIcon, MuteIcon, PauseIcon, PlayIcon, SoundIcon } from '../app/icons';
import { usePlanState, useSettings, useToday } from '../app/state';
import { asToday } from '../core/gentler';
import { BackLink } from '../app/ui';
import { efforts } from '../core/effort';
import type { Plan } from '../core/plans';
import { flatten, lengthLabel } from '../core/workouts';
import { heartRange } from '../core/zones';
import { saveSettings } from '../data/store';
import { locate } from './WorkoutPage';

const clock = (seconds: number) => {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

function say(text: string) {
  try {
    const speech = window.speechSynthesis;
    if (!speech) return;
    speech.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.rate = 0.95;
    speech.speak(line);
  } catch {
    // No voice on this device; the screen still shows everything.
  }
}

/** Mixes with whatever music is already playing, instead of stopping it. */
function shareAudio() {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
    void audio().resume();
  } catch {
    // Older browsers: the bell may stay quiet; the voice still works.
  }
}

function spoken(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} seconds`;
  const whole = Math.round(minutes);
  return whole === 1 ? '1 minute' : `${whole} minutes`;
}

/**
 * Walks through a session step by step: what to do now, how long is left,
 * what comes next. Time is worked out from the clock, so if the phone
 * sleeps it is still right on waking. Nothing moves until Start.
 */
export default function GuidePage({ nav, id, plan, intention }: { nav: Nav; id: string; plan?: Plan; intention?: string }) {
  const settings = useSettings();
  const planState = usePlanState();
  const today = useToday();
  const located = locate(id, plan);
  const found = located && { ...located, workout: asToday(located.workout, planState?.lighter, today) };
  const steps = useMemo(() => (found ? flatten(found.workout.parts) : []), [found?.workout.id, found?.workout.title]);
  const bounds = useMemo(() => {
    let at = 0;
    return steps.map((item) => {
      const start = at;
      at += item.minutes * 60;
      return { start, end: at };
    });
  }, [steps]);
  const total = bounds.at(-1)?.end ?? 0;
  const cues = useMemo(() => cuesFor(steps), [steps]);
  const song = useNowPlaying();
  const [pocket, setPocket] = useState(false);
  const held = useRef(false);

  const [startedAt, setStartedAt] = useState<number>();
  const [pausedAt, setPausedAt] = useState<number>();
  const [pausedFor, setPausedFor] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const spokenIndex = useRef(-1);
  const minuteWarned = useRef(-1);
  const lock = useRef<{ release(): Promise<void> } | null>(null);

  const running = startedAt !== undefined && pausedAt === undefined && !finished;
  const elapsed = startedAt === undefined ? 0 : ((pausedAt ?? now) - startedAt - pausedFor) / 1000;
  const index = Math.max(0, bounds.findIndex((b) => elapsed < b.end));
  const current = steps[index];
  const left = bounds[index] ? bounds[index].end - elapsed : 0;
  const next = steps[index + 1];

  // Where the session is, for handlers that outlive a render.
  const timing = useRef({ startedAt, pausedFor });
  timing.current = { startedAt, pausedFor };
  const elapsedAt = (time: number) => (time - (timing.current.startedAt ?? time) - timing.current.pausedFor) / 1000;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    const wake = () => {
      setNow(Date.now());
      // Back on the screen: hand the bells to the audio clock again, from here, in case it slept.
      if (document.visibilityState === 'visible' && settings.bells) void scheduleCues(cues, elapsedAt(Date.now()));
    };
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [running]);

  // Keep the screen on while running, if chosen.
  useEffect(() => {
    if (!running || !settings.keepAwake) return;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
    void wakeLock
      ?.request('screen')
      .then((held) => (lock.current = held))
      .catch(() => undefined);
    return () => {
      void lock.current?.release().catch(() => undefined);
      lock.current = null;
    };
  }, [running, settings.keepAwake]);

  // Cues: a bell and a few words as each step begins, and a minute's notice on long steps.
  useEffect(() => {
    if (!running || !current) return;
    if (elapsed >= total) {
      setFinished(true);
      tap(60);
      if (settings.voice) say('That’s the session.');
      return;
    }
    if (spokenIndex.current !== index) {
      spokenIndex.current = index;
      // A buzz with each change, for a phone in a pocket (where the phone allows it).
      if (index > 0) tap(40);
      if (settings.voice) say(`${efforts[current.effort].say}, ${spoken(current.minutes)}.`);
    }
    if (current.minutes >= 4 && left <= 60 && minuteWarned.current !== index) {
      minuteWarned.current = index;
      if (settings.voice) say(next ? `One minute left. Then ${efforts[next.effort].say.toLowerCase()}.` : 'One minute left.');
    }
  });

  // The bell, ready before Start (and kept on the phone for sessions without signal).
  useEffect(() => void buffer(BELL_FILE).catch(() => undefined), []);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      cancelCues();
      stopSongs();
      if (held.current) letGo();
    },
    [],
  );

  if (!found)
    return (
      <div className="page">
        <BackLink label="Back" onBack={nav.back} />
      </div>
    );

  const start = () => {
    // With another app's music, mix with it (the screen stays on); otherwise play as media, so the bells go on with the screen locked.
    if (settings.music === 'other') shareAudio();
    else if (!held.current) {
      wakeAudio();
      held.current = true;
    }
    if (settings.bells) void scheduleCues(cues, 0);
    if (settings.music === 'mine') void playSongs(settings.shuffle);
    setStartedAt(Date.now());
    setNow(Date.now());
  };
  const togglePause = () => {
    if (pausedAt === undefined) {
      setPausedAt(Date.now());
      window.speechSynthesis?.cancel();
      cancelCues();
      pauseSongs();
    } else {
      const total = pausedFor + (Date.now() - pausedAt);
      setPausedFor(total);
      setPausedAt(undefined);
      if (settings.bells && startedAt !== undefined) void scheduleCues(cues, (Date.now() - startedAt - total) / 1000);
      resumeSongs();
    }
  };
  const end = () => {
    window.speechSynthesis?.cancel();
    nav.swap({ name: 'entry', workoutId: found.workout.id, seconds: Math.round(elapsed), intention });
  };
  const range = current ? heartRange(current.effort, settings) : undefined;

  return (
    <div className="guide">
      {pocket && !finished && <Pocket onWake={() => setPocket(false)} left={clock(left)} />}
      <div className="guide__top">
        <BackLink label={startedAt ? 'Leave' : 'Back'} onBack={nav.back} />
        <button
          type="button"
          className="icon-button"
          aria-label={settings.voice ? 'Turn spoken cues off' : 'Turn spoken cues on'}
          onClick={() => saveSettings({ ...settings, voice: !settings.voice })}
        >
          {settings.voice ? <SoundIcon size={20} /> : <MuteIcon size={20} />}
        </button>
      </div>
      <p className="guide__session">
        {found.workout.title}
        {startedAt !== undefined && !finished && ` · step ${index + 1} of ${steps.length}`}
      </p>

      {finished ? (
        <div className="guide__done">
          <h1 className="guide__effort">That’s the session.</h1>
          <p className="muted">{lengthLabel(elapsed / 60)}. Note how it went, or just close.</p>
          <button type="button" className="button-main" onClick={end}>
            Log it
          </button>
          <button type="button" className="button-quiet" onClick={nav.back}>
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="guide__now">
            <h1 className="guide__effort">{startedAt === undefined ? 'Ready when you are' : efforts[current.effort].say}</h1>
            <p className="guide__talk">
              {startedAt === undefined
                ? `${lengthLabel(total / 60)} in all. Start your watch too, if you wear one.`
                : `${current.note ? `${current.note}. ` : ''}${efforts[current.effort].talk}${range ? ` ${range[0]}–${range[1]} bpm.` : ''}`}
            </p>
          </div>
          <p className="guide__time" aria-live="off">
            {clock(startedAt === undefined ? (steps[0]?.minutes ?? 0) * 60 : left)}
          </p>
          <p className="guide__left">{startedAt === undefined ? 'first step' : 'left in this step'}</p>

          <div className="guide__bar" aria-hidden="true">
            {steps.map((item, i) => (
              <span
                key={i}
                className={`guide__seg guide__seg--${item.effort}${i < index ? ' guide__seg--past' : ''}${i === index && startedAt !== undefined ? ' guide__seg--now' : ''}`}
                style={{ flexGrow: item.minutes }}
              />
            ))}
          </div>
          <p className="guide__next">
            {startedAt === undefined
              ? `First: ${efforts[steps[0].effort].name.toLowerCase()}, ${lengthLabel(steps[0].minutes)}`
              : next
                ? `Then: ${efforts[next.effort].name.toLowerCase()}, ${lengthLabel(next.minutes)}`
                : 'Last step'}
          </p>
          {intention && <p className="guide__intention">“{intention}”</p>}
          {startedAt !== undefined && song.name && (
            <div className="guide__music">
              <span className="guide__song">♪ {song.name}</span>
              <button type="button" className="text-link" onClick={skipSong}>
                Next song
              </button>
            </div>
          )}

          <div className="guide__controls">
            {startedAt !== undefined ? (
              <button type="button" className="guide__side guide__pocket" onClick={() => setPocket(true)}>
                <LockIcon size={18} />
                <span>Pocket</span>
              </button>
            ) : (
              <span className="guide__side" />
            )}
            {startedAt === undefined ? (
              <button type="button" className="guide__play" aria-label="Start" onClick={start}>
                <PlayIcon size={30} />
              </button>
            ) : (
              <button type="button" className="guide__play" aria-label={pausedAt ? 'Go on' : 'Pause'} onClick={togglePause}>
                {pausedAt ? <PlayIcon size={30} /> : <PauseIcon size={30} />}
              </button>
            )}
            <span className="guide__side">{startedAt !== undefined && `${clock(elapsed)} in`}</span>
          </div>
          {startedAt !== undefined && (
            <button type="button" className="button-quiet guide__end" onClick={end}>
              End here and log it
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * For a phone in a pocket: a black screen that ignores touches until it is
 * held for a moment. The screen stays awake underneath, so cues keep coming.
 */
function Pocket({ onWake, left }: { onWake: () => void; left: string }) {
  const timer = useRef<number | undefined>(undefined);
  const [holding, setHolding] = useState(false);
  const begin = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      tap(30);
      onWake();
    }, 1200);
  };
  const cancel = () => {
    setHolding(false);
    window.clearTimeout(timer.current);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div
      className={`pocket${holding ? ' pocket--holding' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Hold to wake the screen"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => event.key === 'Enter' && onWake()}
    >
      <span className="pocket__time">{left}</span>
      <span className="pocket__hint">Hold to wake</span>
    </div>
  );
}
