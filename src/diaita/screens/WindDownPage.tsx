import { useEffect, useMemo, useRef, useState } from 'react';
import { BackIcon, BookIcon, CheckIcon, MoonIcon, TimerIcon } from '../../app/family/icons';
import { audio, buffer, gain, letGo, playOnce, wakeAudio } from '../../app/sound/engine';
import { player } from '../../app/sound/player';
import { BELL_FILE } from '../../app/sound/soundscapes';
import { breathAt, breathPattern } from '../../core/meditate/breathing';
import type { DiaitaNav } from '../app/App';
import { defaultWindDown, windDownAt, windDownMinutes, windDownPiece, type WindDownPieceId } from '../core/windDown';

const SOUND_CHOICES = [
  { id: null, label: 'Silence' },
  { id: 'rain', label: 'Rain' },
  { id: 'fan', label: 'Fan' },
] as const;

function say(text: string): void {
  try {
    const speech = window.speechSynthesis;
    if (!speech) return;
    speech.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.rate = 0.9;
    speech.speak(line);
  } catch {
    // The screen still carries the words when this device has no spoken voice.
  }
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function pieceWords(id: WindDownPieceId): string {
  if (id === 'breathing') return 'Breathe in. Breathe out.';
  if (id === 'muscles') return 'Notice your body, tense one group, and let it soften.';
  if (id === 'body-scan') return 'Notice your feet, legs, belly, chest, hands, shoulders, face.';
  return 'Write tomorrow’s list in Capture, then leave it there.';
}

function BreathingCue({ elapsed }: { elapsed: number }) {
  const pattern = breathPattern('even');
  const moment = breathAt(elapsed, pattern);
  return <p className="diaita-wind-down__breath">{moment.step.kind === 'in' ? 'Breathe in' : 'Breathe out'}</p>;
}

export default function WindDownPage({ nav }: { nav: DiaitaNav }) {
  const [selected, setSelected] = useState<WindDownPieceId[]>([...defaultWindDown]);
  const [sound, setSound] = useState<string | null>('rain');
  const [spoken, setSpoken] = useState(true);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const saidPiece = useRef(-1);
  const held = useRef(false);
  const bellBus = useRef<GainNode | null>(null);
  const total = windDownMinutes(selected) * 60;
  const current = windDownAt(elapsed, selected);
  const routineLine = useMemo(() => `${windDownMinutes(selected)} minutes`, [selected]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((before) => Math.min(total, before + 0.25)), 250);
    return () => window.clearInterval(timer);
  }, [running, total]);

  useEffect(() => {
    if (!running || !current) return;
    if (saidPiece.current === current.index) return;
    saidPiece.current = current.index;
    if (spoken) say(pieceWords(current.id));
    if (current.index > 0 && bellBus.current) void playOnce(BELL_FILE, bellBus.current).catch(() => undefined);
  }, [current, running, spoken]);

  useEffect(() => {
    if (!running || elapsed < total) return;
    setRunning(false);
    setFinished(true);
    if (spoken) say('That is the routine.');
    if (bellBus.current) void playOnce(BELL_FILE, bellBus.current, 0.1).catch(() => undefined);
    player.stop(2);
    window.setTimeout(() => {
      bellBus.current?.disconnect();
      bellBus.current = null;
      if (held.current) {
        held.current = false;
        letGo();
      }
    }, 2_200);
  }, [elapsed, running, spoken, total]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    player.stop(0.4);
    bellBus.current?.disconnect();
    if (held.current) letGo();
  }, []);

  const toggle = (id: WindDownPieceId) => {
    setFinished(false);
    setSelected((before) => (before.includes(id) ? before.filter((each) => each !== id) : [...before, id]));
  };

  const start = () => {
    if (windDownMinutes(selected) < 10 || windDownMinutes(selected) > 20) return;
    wakeAudio();
    held.current = true;
    const ctx = audio();
    const bus = gain(ctx, 0.55);
    bus.connect(ctx.destination);
    bellBus.current = bus;
    void buffer(BELL_FILE).catch(() => undefined);
    void playOnce(BELL_FILE, bus, 0.1).catch(() => undefined);
    player.startSit(sound ? [sound] : []);
    saidPiece.current = -1;
    setElapsed(0);
    setFinished(false);
    setRunning(true);
  };

  if (running || finished) {
    return (
      <div className="diaita-wind-down-screen" role="dialog" aria-modal="true" aria-label="Wind down">
        <button type="button" className="diaita-wind-down-screen__leave" onClick={nav.back}>{finished ? 'Close' : 'End'}</button>
        {finished ? (
          <div className="diaita-wind-down-screen__center">
            <MoonIcon size={32} />
            <h1>Wind down complete</h1>
            <p>Let the room stay dim and go to bed when you are ready.</p>
            <button type="button" className="button-main" onClick={nav.back}>Done</button>
          </div>
        ) : (
          <div className="diaita-wind-down-screen__center">
            <p className="diaita-wind-down-screen__step">{current ? windDownPiece(current.id).title : 'Wind down'}</p>
            {current?.id === 'breathing' ? <BreathingCue elapsed={elapsed} /> : <p className="diaita-wind-down-screen__words">{current ? pieceWords(current.id) : ''}</p>}
            {current?.id === 'park-tomorrow' && <a className="button-quiet" href="/capture">Open Capture</a>}
            <p className="diaita-wind-down-screen__left">{clock(total - elapsed)} left</p>
          </div>
        )}
      </div>
    );
  }

  const validLength = windDownMinutes(selected) >= 10 && windDownMinutes(selected) <= 20;
  return (
    <div className="page diaita-page diaita-wind-down">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Today</button>
      </div>
      <h1 className="title">Wind down</h1>

      <div className="diaita-piece-list">
        {(['breathing', 'muscles', 'body-scan', 'park-tomorrow'] as WindDownPieceId[]).map((id) => {
          const piece = windDownPiece(id);
          const on = selected.includes(id);
          return (
            <div key={id} className={`diaita-piece${on ? ' diaita-piece--on' : ''}`}>
              <button type="button" className="diaita-piece__main" aria-pressed={on} onClick={() => toggle(id)}>
                <span className="diaita-piece__icon">{on ? <CheckIcon size={20} /> : <span />}</span>
                <span className="diaita-piece__words"><strong>{piece.title}</strong><small>{piece.line}</small></span>
                <span className="diaita-piece__minutes">{piece.minutes} min</span>
              </button>
              <details className="diaita-piece__source"><summary>Source</summary><span>{piece.source}</span></details>
            </div>
          );
        })}
      </div>

      <div className="diaita-wind-down__summary">
        <span>{routineLine}</span>
        {!validLength && <span>{windDownMinutes(selected) < 10 ? 'Add a piece' : 'Choose fewer pieces'}</span>}
      </div>

      <section className="card diaita-wind-down__options">
        <p className="label">Along the way</p>
        <div className="chip-row" role="group" aria-label="Sound">
          {SOUND_CHOICES.map((choice) => (
            <button key={choice.label} type="button" className="chip" aria-pressed={sound === choice.id} onClick={() => setSound(choice.id)}>{choice.label}</button>
          ))}
        </div>
        <button type="button" className="diaita-option-row" role="switch" aria-checked={spoken} onClick={() => setSpoken((before) => !before)}>
          <span><BookIcon size={20} />Spoken cues</span><span>{spoken ? 'On' : 'Off'}</span>
        </button>
      </section>

      <button type="button" className="button-main diaita-wind-down__start" disabled={!validLength} onClick={start}><TimerIcon size={18} />Start</button>
      <button type="button" className="button-quiet diaita-wind-down__cant" onClick={() => nav.go({ name: 'cant-sleep' })}><MoonIcon size={18} />Can’t sleep</button>
      <p className="hint">Leave at any point.</p>
    </div>
  );
}
